const cryptography = require('./cryptography.js');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const express = require('express');
const app = express();
const port = 8000;
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/resources/');
    },
    filename: function (req, file, cb) {
      const extension = file.mimetype.split('/')[1];
      cb(null, `${file.fieldname}-${Date.now()}.${extension}`);
    },
  });
  

const upload = multer({ storage: storage });


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'CloudBrainTreasure'
});


app.get('/', (req, res) => {
    var id_user = req.cookies.id;
    if(id_user){
        connection.query('SELECT * FROM users WHERE id = ?', [id_user], function (error, results, fields) {
            if(results[0].fa_enabled != 1){
                res.redirect('/2fa_autentication');
            }else{
                res.render("dashboard", {message: ""})
            }
        });
    }else{
        res.render('index');
    }
});


app.get('/login', (req, res) => {
    res.render('login');
});


app.post('/login', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    var password_encrypted = cryptography.encryptMessage(password);
    if (username && password) {
        connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password_encrypted], function (error, results, fields) {
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
    var password_encrypted = cryptography.encryptMessage(password);
    var email_encrypted = cryptography.encryptMessage(email);
    if (username && password && email) {
        connection.query("INSERT INTO `users` (`id`, `username`, `password`, `email`, `fa_enabled`) VALUES (NULL, ?, ?, ?, '0');", [username, password_encrypted, email_encrypted], function (error, results, fields) {
            res.redirect('/login');
        });
    } else {
        res.send('Please fill all the inputs!');
    }
    
});


app.get('/dashboard', (req, res) => {
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


app.get('/2fa_autentication', (req, res) => {
    var code = cryptography.generateRandomNumber();
    console.log(code);
    if (req.cookies.id) {
        connection.query('SELECT * FROM users WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            var fa_enabled = results[0].fa_enabled;
            if (results.length == 1) {
                if (fa_enabled == 1) {
                    res.redirect('/');
                } else if (fa_enabled == 0) {
                    res.cookie('code', code);
                    res.render('2fa_autentication');
                }
            } else {
                res.redirect('/');
            }
        });
    }
});


app.post('/2fa_autentication', (req, res) => {
    var auth_code = req.body.code;
    var code = req.cookies.code;

    if (auth_code == code) {
        connection.query('UPDATE users SET fa_enabled = 1 WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            res.redirect('/');
        });
    } else {
        res.send('Incorrect code!');
        app.render('2fa_autentication');
    }
});


app.get('/add_recurso', (req, res) => {
    if(req.cookies.id){
        connection.query('SELECT * FROM users WHERE id = ?', [req.cookies.id], function (error, results, fields) {
            if(results[0].fa_enabled != 1){
                res.redirect('/2fa_autentication');
            }
            if (results.length == 1) {
                connection.query("SELECT * FROM disciplinas", function (error, results, fields) {
                    res.render('add_recurso', {disciplinas: results, error: ""});
                });
            } else {
                res.redirect('/');
            }
        });
}
});


app.post('/add_recurso', upload.single('file'), (req, res) => {
    
    var titulo = req.body.title;
    var descricao = req.body.description;
    var disciplina = req.body.discipline;
    var id_user = req.cookies.id;
    var data = new Date();
    var data_str = data.getDate() + "-" + (data.getMonth()+1) + "-" + data.getFullYear();
    var file = req.file;
    var file_name = file.filename;
    var file_type = file.mimetype;
    var file_path = file.path;

    if (disciplina == "other"){
        var disciplina = req.body.other_discipline;
        connection.query("SELECT * FROM disciplinas WHERE nome = ?", [disciplina], function (error, results, fields) {
            if(results.length == 0){
                connection.query("INSERT INTO `disciplinas` (`id`, `nome`) VALUES (NULL, ?);", [disciplina], function (error, results, fields) {
                    if(error)throw error;
                });
        }else{
            connection.query("SELECT * FROM disciplinas", function (error, results, fields) {
                res.render('add_recurso', {disciplinas: results, error: "Disciplina já existente!"});
            });
        }
    });
    }
    connection.query("SELECT * FROM resources WHERE title = ?", [titulo], function (error, results, fields) {
        if(error) throw error;
        if(results.length == 1){
            res.render('dashboard', {message: "Recurso não inserido, já existe um recurso com o mesmo titulo!"});
        }});
    connection.query("INSERT INTO `resources` (`id`, `discipline_id`, `user_id`, `title`, `description`, `file_type`, `file_path`, `upload_date`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?);", [disciplina, id_user, titulo, descricao, file_type, file_path, data_str], function (error, results, fields) {
        if(error)throw error;
        res.render('dashboard', {message: "Recurso Inserido com sucesso!"});
    });

  
    // Do something with the file
  
    
});


app.get('/search_resource', (req, res) => {
    if(req.cookies.id){
    res.render('search_resource', { searchResults: "" });
    }else{
        res.redirect('/');
    }
  });
  
  app.post('/search_resource', (req, res) => {
    const search = req.body.search;
    if (search === "") {
      res.render('search_resource', { searchResults: [] });
    } else {
      const sql = "SELECT r.*, d.name AS discipline_name FROM resources AS r JOIN disciplinas AS d ON r.discipline_id = d.id WHERE r.title LIKE ? OR r.description LIKE ?;";
      const params = ['%' + search + '%', '%' + search + '%'];
      connection.query(sql, params, function (error, results, fields) {
        if (error) {
          throw error;
        } else {
          res.render('search_resource', { searchResults: results });
        }
      });
    }
  });
  
  

app.get('/view_resource/:id', (req, res) => {
    if(req.cookies.id){
    const resourceId = req.params.id;
    var user_liked;
    var num_likes;
    var num_reports;
    var disciplina;
    var username;
    var user_id;
    var file_path;
    var file_name;
    connection.query("SELECT * FROM likes WHERE user_id = ? AND resource_id = ?", [req.cookies.id, resourceId], function (error, results, fields) {
        if(error) throw error;
        if(results.length == 1){
            user_liked = true;
        }else{
            user_liked = false;
        }
    });
    connection.query("SELECT COUNT(*) AS num_likes FROM likes WHERE resource_id = ?;", [resourceId], function (error, likes, fields) {
        if(error) throw error;
        num_likes = likes[0].num_likes;
        
        connection.query("SELECT COUNT(*) AS num_reports FROM reports WHERE resource_id = ?;", [resourceId], function (error, reports, fields) {
            if(error) throw error;
            num_reports = reports[0].num_reports;
            
            connection.query("SELECT * FROM disciplinas WHERE id = (SELECT discipline_id FROM resources WHERE id = ?)", [resourceId], function (error, results, fields) {
                if (error) throw error;
                disciplina = results[0].name;
                
                connection.query("SELECT * FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
                    if (error) throw error;
                    user_id = results[0].user_id;
                    file_path = results[0].file_path;
                    file_name = file_path.split("/").pop();
                    
                    connection.query("SELECT * FROM users WHERE id = ?", [user_id], function (error, results2, fields) {
                        if (error) throw error;
                        username = results2[0].username;
                        res.render('view_resource', {resource: results[0], file_name: file_name, num_likes: num_likes, num_reports: num_reports, disciplina: disciplina, username: username, user_liked: user_liked});
                    });
                });
            });
        });
    });
    }else{
        res.redirect('/');
    }
});

  


app.get('/logout', (req, res) => {
    res.clearCookie('id');
    res.redirect('/');
});


app.get('/report_recurso', (req, res) => {
    if(req.cookies.id){
    connection.query('SELECT * from disciplinas', function(error, results, fields) {
		if (error) throw error;
		
		res.render('report_recurso', {categories: results, subcategories: []});
	});
}else{
    res.redirect('/');
}
});


app.get('/get_subcategories/:category_id', (req, res) => {
    if(req.cookies.id){
    const categoryId = req.params.category_id;
    connection.query("SELECT * FROM resources WHERE discipline_id = ?;", [categoryId], function (error, results, fields) {
        if (error) throw error;
        res.send(results);
    });
}else{
    res.redirect('/');
}
});


app.post('/report_recurso', (req, res) => {
 var recurso = req.body.subcategory;
 var motivo = req.body.reason;
 var id_user = req.cookies.id;
 connection.query("SELECT * FROM reports WHERE user_id = ? AND resource_id = ?;", [id_user, recurso], function (error, results, fields) {
    if (error) throw error;
    if(results.length == 0){
        connection.query("INSERT INTO reports (`id`, `resource_id`, `user_id`, `reason`) VALUES (NULL, ?, ?, ?);", [recurso, id_user, motivo], function (error, results, fields) {
            if(error) throw error;
            res.render('dashboard', {message: "Recurso reportado com sucesso!"});
        });
    }else{
        res.render('dashboard', {message: "Já reportaste este recurso!"});
    }
});
});


app.get('/likes/:id', (req, res) => {
    if(req.cookies.id){
    const resourceId = req.params.id;
    var id_user = req.cookies.id;
    connection.query("SELECT * FROM likes WHERE user_id = ? AND resource_id = ?;", [id_user, resourceId], function (error, results, fields) {
        if (error) throw error;
        if(results.length == 0){
            connection.query("INSERT INTO likes (`id`, `resource_id`, `user_id`) VALUES (NULL, ?, ?);", [resourceId, id_user], function (error, results, fields) {
                if(error) throw error;
                res.redirect('/view_resource/' + resourceId);
            });
        }else{
            connection.query("DELETE FROM likes WHERE user_id = ? AND resource_id = ?;", [id_user, resourceId], function (error, results, fields) {
                if(error) throw error;
                res.redirect('/view_resource/' + resourceId);
            });
        }
    });
}else{
    res.redirect('/');
}
});


app.get('/ver_disciplinas', (req, res) => {
    if(req.cookies.id){
    connection.query("SELECT * FROM disciplinas", function (error, results, fields) {
        if (error) throw error;
        res.render('ver_disciplinas', {disciplinas: results});
    });
}else{
    res.redirect('/');
}
});


app.get('/add_disciplina', (req, res) => {
    if(req.cookies.id){
    res.render('add_disciplina');
    }else{
        res.redirect('/');
    }
});


app.post('/add_disciplina', (req, res) => {
    var disciplina = req.body.nome_disciplina;

    connection.query("SELECT * FROM disciplinas WHERE name = ?", [disciplina], function (error, results, fields) {
      if (error) throw error;
      if(results.length == 0){
        connection.query("INSERT INTO disciplinas (`id`, `name`) VALUES (NULL, ?)", [disciplina], function (error, results, fields) {
          if(error) throw error;
          res.render('dashboard', {message: "Disciplina adicionada com sucesso!"});
        });
      }else{
        res.render('dashboard', {message: "Essa disciplina já existe!"});
      }
    });
  });  

app.get('/gerir_posts', (req, res) => {
    var id_user = req.cookies.id;
    if(req.cookies.id){
    connection.query("SELECT * FROM resources WHERE user_id = ?", [id_user], function (error, results, fields) {
        if (error) throw error;
        res.render('gerir_posts', {recursos: results});
    });
}else{
    res.redirect('/');
}
});


app.get('/remove_recurso/:id', (req, res) => {
    const resourceId = req.params.id;
    if(req.cookies.id){
    connection.query("DELETE FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
        if (error) throw error;
        res.redirect('/gerir_posts');
    });
}else{
    res.redirect('/');
}
});


app.get('/edit_recurso/:id', (req, res) => {
    var resourceId = req.params.id;
    if(req.cookies.id){
    connection.query("SELECT * FROM disciplinas", function (error, results, fields) {
        res.render('edit_recurso', {disciplinas: results, error: "", resourceId: resourceId});
    });
}else{
    res.redirect('/');
}
});


app.post('/edit_recurso/:id', upload.single('file'), (req, res) => {
    var resourceId = req.params.id;
    var title = req.body.title;
    var description = req.body.description;
    var disciplina = req.body.discipline;
    var file = req.file;
    var file_type;
    var file_path;
  
    if (!title) {
      connection.query("SELECT title FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
        if (error) throw error;
        title = results[0].title;
  
        connection.query("UPDATE `resources` SET `title` = ? WHERE `resources`.`id` = ?;", [title, resourceId], function (error, results, fields) {
          if (error) throw error;
        });
      });
    } else {
      connection.query("UPDATE `resources` SET `title` = ? WHERE `resources`.`id` = ?;", [title, resourceId], function (error, results, fields) {
        if (error) throw error;
      });
    }
  
    if (!description) {
      connection.query("SELECT description FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
        if (error) throw error;
        description = results[0].description;
  
        connection.query("UPDATE `resources` SET `description` = ? WHERE `resources`.`id` = ?;", [description, resourceId], function (error, results, fields) {
          if (error) throw error;
        });
      });
    } else {
      connection.query("UPDATE `resources` SET `description` = ? WHERE `resources`.`id` = ?;", [description, resourceId], function (error, results, fields) {
        if (error) throw error;
      });
    }
  
    if (!disciplina) {
      connection.query("SELECT discipline_id FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
        if (error) throw error;
        disciplina = results[0].discipline_id;
  
        connection.query("UPDATE `resources` SET `discipline_id` = ? WHERE `resources`.`id` = ?;", [disciplina, resourceId], function (error, results, fields) {
          if (error) throw error;
          console.log("Disciplina" + disciplina);
        });
      });
    } else {
      connection.query("UPDATE `resources` SET `discipline_id` = ? WHERE `resources`.`id` = ?;", [disciplina, resourceId], function (error, results, fields) {
        if (error) throw error;
        console.log("Disciplina" + disciplina);
      });
    }

    if (!file) {
        connection.query("SELECT file_path, file_type FROM resources WHERE id = ?", [resourceId], function (error, results, fields) {
            if (error) throw error;
            file_path = results[0].file_path;
            file_type = results[0].file_type;
    
            connection.query("UPDATE `resources` SET `file_path` = ? WHERE `resources`.`id` = ?;", [file_path, resourceId], function (error, results, fields) {
            if (error) throw error;
            });
        });
        }else{
        file_path = file.path;
        file_type = file.mimetype;

        connection.query("UPDATE `resources` SET `file_path` = ?, `file_type` = ? WHERE `resources`.`id` = ?;", [file_path, file_type, resourceId], function (error, results, fields) {
            if (error) throw error;
        });
        }

    
});
  


app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://192.168.1.76:${port}`);
});
