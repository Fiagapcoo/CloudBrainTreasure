const express = require('express');
const app = express();
const port = 8000;
const cookieParser = require('cookie-parser');
const mysql = require('mysql');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'CloudBrainTreasure'
});

app.use(cookieParser());

app.get('/', (req, res) => {
    var id_user = req.cookies.id;
    if(id_user){
        connection.query('SELECT * FROM users WHERE id = ?', [id_user], function (error, results, fields) {
            if(results[0].fa_enabled != 1){
                res.redirect('/2fa_autentication');
            }else{
                res.redirect('/dashboard');
            }
        });
    }else{
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    if (username && password) {
        connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function (error, results, fields) {
            if (results.length == 1) {
                res.cookie('id', results[0].id);
                res.redirect('/');
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    } else {
        res.send('Please enter Username and Password!');
    }
});


app.get('/register', (req, res) => {
    res.render('register');
});
app.post('/register', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;
    if (username && password && email) {
        connection.query("INSERT INTO `users` (`id`, `username`, `password`, `email`, `fa_enabled`) VALUES (NULL, ?, ?, ?, '0');", [username, password, email], function (error, results, fields) {
            res.redirect('/login');
        });
    } else {
        res.send('Please fill all the inputs!');
    }
    
});

app.get('/dashboard', (req, res) => {//falta veriricar se tem 2fa
    if (req.cookies.id) {
        connection.query('SELECT * FROM users WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            if(results[0].fa_enabled != 1){
                res.redirect('/2fa_autentication');
            }
            if (results.length == 1) {
                res.render('dashboard');
            } else {
                res.redirect('/login');
            }
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('id');
    res.redirect('/');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://0.0.0.0:${port}`);
});
