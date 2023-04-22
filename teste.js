const cryptography = require('./cryptography');

var a = "filipeaguilar01@gmail.com";

var b = cryptography.encryptMessage(a);

console.log("b: "+b);

var c = cryptography.decryptMessage(b);

console.log("c: "+c);