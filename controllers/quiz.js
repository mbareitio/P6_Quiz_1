const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId)
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// GET /quizzes
exports.index = (req, res, next) => {

    req.session.score = 0;
    
    models.quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "", 
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/quizzes');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};


//GET /quizzes/randomPlay
exports.randomPlay = (req, res, next) => {

    if (req.session.randomplay === undefined) {
        req.session.randomplay = [];
    } else {
        req.session.randomplay = req.session.randomplay;
    }
    
    console.log(req.session);

    Sequelize.Promise.resolve()
        .then(() => {
            return models.quiz.count({where: {'id':{[Sequelize.Op.notIn]: req.session.randomplay}}})
            .then(notIn => { //Numero de quizzes que no están en el random play
                console.log('Numero de quizzes que no estan en randomPlay es: ' + notIn);
                let i = Math.floor(Math.random()*notIn); // Id aleatorio

                console.log('El numero aleatorio es: ' + i);
                return models.quiz.findAll({where: {'id':{[Sequelize.Op.notIn]: req.session.randomplay}}})
                .then(quizzes => {
                    return quizzes[i]; //Devolvemos un quiz aleatorio
                })
            })
        })

        .then(quiz => {
            console.log('El quiz aleatorio es: ' + quiz.question);
            let score = req.session.randomplay.length;
            res.render('quizzes/random_play', {
                quiz: quiz, 
                score: score
            });
        })
};


//GET /quizzes/randomCheck
exports.randomCheck = (req, res, next) => {


    let totalQuizzes; //numero total de quizzes

    Sequelize.Promise.resolve()
        .then(() => {
            return models.quiz.count()
            .then(num => {
                totalQuizzes = num;
            })
        })

        .then(() => {
            const givenAnswer = req.query.answer || ''; //req.query.['answer']
            const result = req.quiz.answer.toLowerCase().trim() === givenAnswer.toLowerCase().trim();
            if(result){ //Acierto
                req.session.randomplay.push(req.quiz.id);  
                const score = req.session.randomplay.length;
                if(score === totalQuizzes){ //No hay más preguntas que mostrar
                    console.log('NO HAY MAS PREGUNTAS')
                    req.session.randomplay = [];
                    res.render('quizzes/random_nomore', {
                        score: score
                    });
                }  else {
                    res.render('quizzes/random_result', {
                        score: score,
                        answer: givenAnswer,
                        result: result
                    }); 
                }   
            } else { //Fallo
                const score = req.session.randomplay.length; //guardamos puntos
                req.session.randomplay = [];
                res.render('quizzes/random_result', {
                    score: score,
                    answer: givenAnswer,
                    result: result
                }); 
            }
        });
};

