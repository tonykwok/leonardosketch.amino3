/*
load js file
look for @overview
copy everything after that into a master overview util @end

look for classes
    copy everything after @class to @end into a string
look for properties
look for functions

render everything out into a single doc by nested loops

*/

var fs = require('fs');


fs.readFile('dist/amino.js', function(err,data) {
        var docs = parseData2(data);
        generateHTML(docs);
});

function escape(str) {
    str = str.replace(/</gm,"&lt;");
    str = str.replace(/>/gm,"&gt;");
    return str;
}

function w(s) {
    console.log(s);
}

function parseData2(data) {
    var docs = {classes:[]};
    data = data.toString();
    var regex = /@(\w+)/mg;
    
    var currentClass = null;
    
    while(true) {
        var res = regex.exec(data);
        if(res == null) break;
        
        if(res[1] == "overview") {
            var end = regex.exec(data);
            docs.overview = escape(data.substring(res.index,end.index));
        }
        
        if(res[1] == "class") {
            var end = regex.exec(data);
            var cls = data.substring(res.index,end.index);
            
            var r = /@class\s*(\w+)\s*(.*)/m;
            var r2 = r.exec(cls);
            currentClass = {
                name:r2[1],
                description:cls, 
                functions:[], 
                properties:[],
            };
            var category = /#category\s*(\w+)/m.exec(cls);
            if(category) {
                currentClass.category = category[1];
            }

            docs.classes.push(currentClass);
        }
        
        if(res[1] == "function") {
            //var r = /@function\s*(\w+)\s*(.*)/gm;
            var r = /@function\s*(\w+)\s*(\(\S*\))*\s*(.*)/gm;
            r.lastIndex = res.index;
            var r2 = r.exec(data);
            var fun = { name: r2[1], args:r2[2], description: r2[3]};
            currentClass.functions.push(fun);
        }
        
        if(res[1] == "property") {
            var r = /@property\s*(\w+)\s*(.*)/gm;
            r.lastIndex = res.index;
            var r2 = r.exec(data);
            var fun = { name: r2[1], description: r2[2]};
            currentClass.properties.push(fun);
        }
        
    }
    return docs;
}



var docs = {
    overview: "nothing",
    classes:[
        {
            name:"Amino",
            description: "amino description",
        },
        {
            name:"Amino2",
            description: "amino description",
        },
    ]
}



function generateHTML(docs) {
    w("<html>");
    w("<head><link rel='stylesheet' href='style.css'></link></head>");
    w("<body>");
   
    var cats = {};
    
    docs.classes.forEach(function(cls) {
        if(cls.category) {
            if(!cats[cls.category]) {
                cats[cls.category] = [];
            }
            cats[cls.category].push(cls);
        }
    });
    
    w("<ul id='nav'>");
    for(var cat in cats) {
        w("<li>");
        w("<p>"+cat+"</p>");
        w("<ul>");
        
        cats[cat].forEach(function(cls) {
            w("<li><a href='#"+cls.name+"'>"+cls.name+"</a></li>");
            cls.rendered = true;
        });
        w("</ul>");
        w("</li>");
    }
    
    for(var n in docs.classes) {
        var cls = docs.classes[n];
        if(cls.rendered) continue;
        w("<li><a href='#"+cls.name+"'>"+cls.name+"</a></li>");
    }
    w("</ul>");
    
    w("<pre id='overview'>");
    w(docs.overview);
    w("</pre>");
    
    
    for(var n in docs.classes) {
        
        var cls = docs.classes[n];
        w("<h2><a id='"+cls.name+"'>"+cls.name+"</a></h2>");
        w("<div class='description'>");
        w(cls.description);
        w("</div>");
        
        if(cls.functions.length > 0) {
            w("<h3>functions</h3>");
            w("<ul>");
            for(var f in cls.functions) {
                w("<li>");
                w("<span>");
                w("<b>" + cls.functions[f].name +"</b>");
                if(cls.functions[f].args) {
                    w("<i>" + cls.functions[f].args +"</i>"); 
                }
                w("</span>");
                w(cls.functions[f].description);
                w("</li>");
            }
            w("</ul>");
        }
        
        if(cls.properties.length > 0) {
            w("<h3>properties</h3>");
            w("<ul>");
            for(var f in cls.properties) {
                w("<li>");
                w("<span><b>" + cls.properties[f].name +"</b></span>");
                w(cls.properties[f].description);
                w("</li>");
            }
            w("</ul>");
        }
        
    }
    
    w("</body></html>");
}
