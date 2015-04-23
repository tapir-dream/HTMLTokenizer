// testcase
var reader = Reader(fs.readFile('C:/Users/Administrator/Desktop/test.html'));
var d = new Date();
var htmlTokenizer = HTMLTokenizer(reader);
var tdl = htmlTokenizer.scanner();
//console.log(tdl);
//console.log(htmlTokenizer.toHTML(tdl));
//console.log(htmlTokenizer.tabClosedCheck(tdl));
//var tdl = htmlTokenizer.HTMLSelector(tdl);
//console.log(tdl);
//console.log(htmlTokenizer.toHTML(tdl));
//var tdl = htmlTokenizer.HTMLFilter(tdl);
console.log(tdl);
//tdl = htmlTokenizer.HTMLAttrValFilter(tdl);
//console.log(htmlTokenizer.toHTML(tdl));
//console.log(new Date() -  d);
