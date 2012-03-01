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
        //var docs = parseData2(data);
        var docs = parseData3(data);
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

/*
parser design
parse line by line
if line starts with / * then inside comment
if line ends with * / then outside comment
if line starts with // then oneline comment
if line starts with @ then it's a special line
if line starts with @class then inside class. grab name right after. start class
if line starts with @end then finishing class
if line starts with @property then do one line property
if line starts with @funciton then do one line function
if line starts with @overview then doing an overview

*/

function Parser() {
    this.incode = false;
    this.endCode = function() {
        this.docs.overview += "</code></pre>\n";
        this.incode = false;
    };
    this.startCode = function() {
        this.docs.overview += "<pre><code>";
        this.incode = true;
    };
    this.appendOverview = function(line) {
        if(this.incode) {
            this.docs.overview += escape(line+"\n");
        } else {
            this.docs.overview += (line+"\n");
        }
    }
    this.appendDescription = function(currentClass, line) {
        currentClass.description += (line+"\n");
    }
    this.startCodeClass = function(currentClass) {
        currentClass.description += "<pre><code>";
        this.incode = true;
    };
    this.endCodeClass = function(currentClass) {
        currentClass.description += "</code></pre>";
        this.incode = false;
    };
    
    this.isBlank = function(line) {
        return /^\s*$/.test(line);
    }
    
    this.isIndented = function(line) {
        return /^\s\s\s\s+/.test(line);
    }

        
    return this;
};

function parseData3(data) {
    var docs = {
        classes:[],
        overview:""
    };
    data = data.toString();
    
    var lines = data.split("\n");
    var insidecomment = false;
    var insideoverview = false;
    var insideclass = false;
    var inpara = false;
    
    var p = new Parser();
    p.docs = docs;
    
    for(var i=0; i<lines.length; i++) {
        var line = lines[i];
        var insideonlinecomment = false;
        
        //start a multiline comment
        if(/^\s*\/\*/.test(line)) {
            //w("starting a comment");
            insidecomment = true;
        }
        if(/\*\//.test(line)) {
            //w("ending a comment");
            insidecomment = false;
        }
        if(/^\s*\/\//.test(line)) {
            insideonelinecomment = true;
        }
        
        if(!insidecomment && !insideonelinecomment) continue;
        
        if(/^\@overview/.test(line)) {
            insideoverview = true;
            //console.log("inside overview");
        }
        
        //end an overview or class
        if(/^\@end/.test(line)) {
            if(p.incode && insideoverview) {
                p.endCode();
            }
            if(p.incode && insideclass) {
                p.endCodeClass(currentClass);
            }
            insideoverview = false;
            insideclass = false;
        }
        
        //start a class
        if(/^\@class/.test(line)) {
            insideclass = true;
            var r = /@class\s*(\w+)\s*(.*)/;
            var r2 = r.exec(line);
            //w("real class = " + r2[1]);
            currentClass = {
                name:r2[1],
                description:"",
                functions:[], 
                properties:[],
            };
            //if(category) {
            //    currentClass.category = category[1];
            //}

            docs.classes.push(currentClass);
            continue;
        }
        
        //category
        if(/^#category/.test(line)) {
            //console.log("category = " + line);
            var category = /#category\s*(\w+)/m.exec(line);
            currentClass.category = category[1];
            continue;
        }
        
        //property
        if(/.*\@property/.test(line)) {
            var r1 = /property\s*(\w+)\s*(.*)/.exec(line);
            //console.log("property " + r1[2]);
            var prop = { name: r1[1], description: r1[2]};
            currentClass.properties.push(prop);
        }
        
        if(/.*\@function/.test(line)) {
            var r2 = /function\s*(\w+)\s*(.*)/.exec(line);
            //qconsole.log("fun " + r2[1]);
            var fun = { name: r2[1], description: r2[2]};
            currentClass.functions.push(fun);
        }
            
        if(insideoverview) {
            //w("overview = " + line);
            //if blank line
            if(p.isBlank(line)) {
                if(inpara) {
                    docs.overview += "</p>\n";
                    inpara = false;
                }
            } else {
                
                //if 4 spaces then text, we are in a pre
                if(p.isIndented(line)) {
                    //w("pre: " + line);
                    if(!p.incode) {
                        p.startCode();
                    }
                } else {
                    if(p.incode) {
                        p.endCode();
                    }
                    if(!inpara) {
                        docs.overview += "<p>\n";
                        inpara = true;
                    }
                }
            }
            p.appendOverview(line);
        }
        if(insideclass) {
            if(p.isBlank(line)) {
                if(inpara) {
                    currentClass.description += "</p>\n";
                    inpara = false;
                }
            } else {
                if(p.isIndented(line)) {
                    if(!p.incode) {
                        p.startCodeClass(currentClass);
                    }
                } else {
                    if(p.incode) {
                        p.endCodeClass(currentClass);
                    }
                    if(!inpara) {
                        currentClass.description += "<p>\n";
                        inpara = true;
                    }
                }
            }
            p.appendDescription(currentClass, line);
        }
        //w("line = " + line);
    }
    
    return docs;
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
    
    w("<div id='overview'>");
    w(docs.overview);
    w("</div>");
    
    
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
