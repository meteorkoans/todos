Todos = new Meteor.Collection('todos');
Lists = new Meteor.Collection('lists');

if (Meteor.isClient) {

    $.validator.setDefaults({
        rules: {
            email: {
                required: true,
                email: true
            },
            password: {
                required: true,
                minlength: 6
            }
        },
        messages: {
            email: {
                required: "You must enter an email address.",
                email: "You've entered an invalid email address."
            },
            password: {
                required: "You must enter a password.",
                minlength: "Your password must be at least {0} characters."
            }
        }
    });

    Template.todos.helpers({
        'todo': function() {
            var currentList = this._id;
            var currentUser = Meteor.userId();
            return Todos.find({listId: currentList, createdBy: currentUser}, {sort: {createdAt: -1}});
        }
    });

    Template.addTodo.events({
        'submit form': function(event) {
            event.preventDefault();
            var todoName = $('[name="todoName"]').val();
            var currentList = this._id;
            var currentUser = Meteor.userId();
            Todos.insert({
                name: todoName,
                completed: false,
                createdAt: new Date(),
                listId: currentList,
                createdBy: currentUser
            });
            $('[name="todoName"]').val('');
        }
    });

    Template.todoItem.events({
        'click .delete-todo': function(event) {
            event.preventDefault();
            var documentId = this._id;
            var confirm = window.confirm('Delete this task?');
            if (confirm) {
                Todos.remove({ _id: documentId });
            }
        },
        'keyup [name=todoItem]': function(event) {
            if (event.which == 13 || event.which == 27) {
                $(event.target).blur();
            } else {
                var documentId = this._id;
                var todoItem = $(event.target).val();
                Todos.update({ _id: documentId }, {$set: {name: todoItem}});
            }
        },
        'change [type=checkbox]': function() {
            var documentId = this._id;
            var isCompleted = this.completed;
            if (isCompleted) {
                Todos.update({_id: documentId}, {$set: {completed: false}});
                console.log("Task marked as incomplete.")
            } else {
                Todos.update({_id: documentId}, {$set: {completed: true}});
                console.log("Task marked as complete.")
            }
        }
    });

    Template.todoItem.helpers({
        'checked': function() {
            var isCompleted = this.completed;
            if (isCompleted) {
                return "checked";
            } else {
                return "";
            }
        }
    });

    Template.todosCount.helpers({
        'totalTodos': function() {
            return Todos.find().count();
        },
        'completedTodos': function() {
            return Todos.find({ completed: true }).count();
        }
    });

    Template.addList.events({
        'submit form': function(event) {
            event.preventDefault();
            var listName = $('[name=listName]').val();
            var currentUser = Meteor.userId();
            Lists.insert({
                name: listName,
                createdBy: currentUser
            }, function(error, results) {
                Router.go('listPage', {_id: results});
            });
            $('[name=listName]').val('');
        }
    });

    Template.lists.helpers({
        'list': function() {
            var currentUser = Meteor.userId();
            return Lists.find({createdBy: currentUser}, {sort: {name: 1}});
        }
    });

    Template.register.events({
        'submit form': function(event) {
            event.preventDefault();
        }
    });

    Template.login.onCreated(function() {
        console.log("The 'login' template was just created.");
    });

    Template.login.onRendered(function() {
        var validator = $('.login').validate({
            submitHandler: function(event) {
                console.log("You just submitted the login form.");
                var email = $('[name=email]').val();
                var password = $('[name=password]').val();
                Meteor.loginWithPassword(email, password, function(error) {
                    if (error) {
                        if (error.reason == "User not found") {
                            validator.showErrors({
                                email: error.reason
                            });
                        }
                        if (error.reason == "Incorrect password") {
                            validator.showErrors({
                                email: error.reason
                            });
                        }
                    } else {
                        var currentRoute = Router.current().route.getName();
                        if (currentRoute == 'login') {
                            Router.go('home');
                        }
                    }
                });
            }
        });
        console.log("The 'login' template was just rendered.");
    });

    Template.login.onDestroyed(function() {
        console.log("The 'login' template was just destroyed.");
    });

    Template.register.onRendered(function() {
        var validator = $('.register').validate({
            submitHandler: function(event) {
                console.log("You just submitted the registered form.");
                var email = $('[name=email]').val();
                var password = $('[name=password]').val();
                Accounts.createUser({
                    email: email,
                    password: password
                }, function(error) {
                    if (error) {
                        if (error.reason == "Email already exists.") {
                            validator.showErrors({
                                email: error.reason
                            });
                        }
                    } else {
                        Router.go('home');
                    }
                });
            }
        });
    });

    Template.login.events({
        'submit form': function(event) {
            event.preventDefault();
        }
    });

    Template.navigation.events({
        'click .logout': function(event) {
            event.preventDefault();
            Meteor.logout();
            Router.go('login');
        }
    })

}

if (Meteor.isServer) {
    Meteor.publish('lists', function() {
        var currentUser = this.userId;
        return Lists.find({ createdBy: currentUser });
    });

    Meteor.publish('todos', function(currentList) {
        var currentUser = this.userId;
        return Todos.find({ createdBy: currentUser, listId: currentList });
    });
}

Router.route('/list/:_id', {
    name: 'listPage',
    template: 'listPage',
    data: function() {
        var currentList = this.params._id;
        var currentUser = Meteor.userId();
        return Lists.findOne({_id: currentList, createdBy: currentUser});
    },
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if (!currentUser) {
            this.render('login');
        } else {
            this.next();
        }
    },
    waitOn: function() {
        var currentList = this.params._id;
        return [Meteor.subscribe('todos'), Meteor.subscribe('lists')];
    }
});

Router.route('/register', {
    name: 'register',
    template: 'register'
});

Router.route('/login');

Router.route('/', {
    name: 'home',
    template: 'home',
    waitOn: function() {
        return Meteor.subscribe('lists');
    }
});

Router.configure({
    layoutTemplate: 'main',
    loadingTemplate: 'loading'
});