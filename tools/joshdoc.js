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

function parseData2(data) {
    var docs = {classes:[]};
    data = data.toString();
    var regex = /@(\w+)/mg;
    
    var currentClass = null;
    
    while(true) {
        var res = regex.exec(data);
        if(res == null) break;
        //console.log(res[1]);
        if(res[1] == "overview") {
            var end = regex.exec(data);
            docs.overview = escape(data.substring(res.index,end.index));
        }
        if(res[1] == "class") {
            var end = regex.exec(data);
            var cls = data.substring(res.index,end.index);
            
            var r = /@class\s*(\w+)\s*(.*)/m;
            var r2 = r.exec(cls);
            //console.log("name = " + r2[1]);
            
            currentClass = {name:r2[1],description:cls, functions:[]};
            docs.classes.push(currentClass);
        }
        if(res[1] == "function") {
            var r = /@function\s*(\w+)\s*(.*)/gm;
            r.lastIndex = res.index;
            var r2 = r.exec(data);
            //console.log("r2 = " + res.index + " " + r2[1]);
            var fun = { name: r2[1], description: r2[2]};
            currentClass.functions.push(fun);
        }
    }
    return docs;
}


function parseData(data) {
    var docs = {classes:[]};
    var regex = new RegExp("@overview([\\s\\S]*?)@end","m");
    docs.overview = escape(regex.exec(data)[1]);
    
    
    var class_regex = /@class\s*(\w+)([\s\S]*?)@end/mg;
    while(true) {
        var result = class_regex.exec(data);
        if(result == null) break;
        //console.log(result[2]);
        
        var cls = {name:result[1], description:result[2]};
        
        var fun = /@function\s*(\w+)\s+(.*)/g;
        while(true) {
            var funresult = fun.exec(data);
            if(funresult == null) break;
            cls.functions = [];
            cls.functions.push({name:funresult[1],description:funresult[2]});
        }
        
        docs.classes.push(cls);
        
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


//generateHTML(docs);

function w(s) {
    console.log(s);
}
function generateHTML(docs) {
    w("<html>");
    w("<head><link rel='stylesheet' href='style.css'></link></head>");
    w("<body>");
/*    
    w("<pre id='overview'>");
    w(docs.overview);
    w("</pre>");
*/    
    
    for(var n in docs.classes) {
        var cls = docs.classes[n];
        w("<h1>"+cls.name+"</h1>");
        w("<div class='description'>");
        w(cls.description);
        w("</div>");
        
        w("<h3>functions</h3>");
        w("<ul>");
        for(var f in cls.functions) {
            w("<li>");
            w("<b>" + cls.functions[f].name +"</b>");
            w(cls.functions[f].description);
            w("</li>");
        }
        w("</ul>");
    }
    
    w("</body></html>");
}
