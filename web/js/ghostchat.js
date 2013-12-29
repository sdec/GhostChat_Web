// Eerste view die start
var INITIAL_VIEW = 'loading';

// Informatie over de applicatie
var app = {
    started: false,                 // App gestart?
    currentView: INITIAL_VIEW,      // Naam van de huidige view
    loading: false,                 // App geladen?
    validating: false,              // Inputvelden zijn aan het valideren?
    chatType: null,                 // Type chat ('join', 'create)
    chatTimer: null,                // Timer binnen een chat (updates)
    startTimer: null,               // Timer v.h. chat scherm
    lastMessageCount: 0,            // Aantal berichten laatst geupdated
    lastOnlineUsersCount: 0,        // Laatste online aantal gebruikers
    popupTimer: null,               // Timer v.h. popup bericht
    username: null,                 // Gebruikersnaam
    chatname: null,                 // Chat naam
    showLocation: true,             // Toon locatie?
    joinedChat: false,              // Gebruiker is in een chat?
    listed: true,                   // Chat is listed?
    location: {                     // Informatie over de locatie
        latitude: null,
        longitude: null,
        country: "Unknown",
        countryCode: "??"
    }
};

// uitgevoerd wanneer de applicatie start
// = body.onload
$(function() {
    popup('Loading the application...');
    init_events();
    init_defaults();
});

// Uitgevoerd wanneer de applicatie afsluit
window.onbeforeunload = function() {
    leaveChat();
};

// Initieel de event handlers
function init_events() {

    popup('Creating events ...');

    // Design
    $(window).resize(function() {
        $(".view-title").css('font-size', (window.innerHeight * 0.070) + 'px');
    }).resize();

    // Global events
    $(".button-start").click(function() {
        view('select-group');
        checkGroupChatInput();
    });
    $(".button-settings").click(function() {
        view('settings');
    });
    $(".button-about").click(function() {
        view('about');
    });


    // Back button actions
    $("\
        #view-select-group .view-button,\n\
        #view-about .view-button,\n\
        #view-settings .view-button,\n\
        #view-select-group .view-button,\n\
        #view-select-ono .view-button\n\
    ").click(function() {
        view('start');
    });
    
    $("#view-show-listed .view-button").click(function() {
        view('select-group');
    });

    // Chats
    $("\
        #view-chat-group .view-button,\n\
        #view-chat-ono .view-button\n\
    ").click(function() {
        leaveChat();
    });

    // Settings
    $("#view-settings #toggle-location").click(onToggleLocation);
    $("#view-settings #toggle-listed").click(onToggleListed);
    $("#listchats").click(listChat); // Just info

    // Chat validation
    $("#view-select-group .input-username").keyup(function() {
        checkGroupChatInput();
    });
    $("#view-select-ono .input-username").keyup(function() {
        checkOneOnOneChatInput();
    });
    $("#view-select-ono .select-next, #view-select-ono .select-prev").click(function() {
        view('select-group');
        checkGroupChatInput();
    });
    $("#view-select-group .input-chatname").keyup(checkGroupChatInput);
    $("#view-select-group .select-next, #view-select-group .select-prev").click(function() {
        view('select-ono');
        checkOneOnOneChatInput();
    });
    $("#view-select-ono .select-next, #view-select-ono .select-prev").click(function() {
        view('select-group');
        checkGroupChatInput();
    });
    $("#show-listed").click(function() {
       showListedChats(); 
    });
    
    $("#link-group-create, #link-group-join").click(joinChat);
    $("#link-ono-join").click(onOneOnOneChatCreate);

    // Messages
    $(".chat-send").click(function() {
        if (app.joinedChat === true) {
            sendMessage();
        }
    });
    $("#chat-group-message").keyup(function(e) {
        if (e.keyCode === 13) { // Enter
            if (app.joinedChat === true) {
                sendMessage();
            }
        }
    });

    // Users
    $(".chat-stats img").click(function() {
        if (app.joinedChat === true) {
            showChatUsers();
        }
    });
    $("#view-chat-users .view-button").click(function() {
        view('chat-group');
    });
}

function init_defaults() {
    popup('Initializing defaults ...');
    updateLocation();
}

function init_initialView() {
    hidePopup();
    view('start');
}

// Sluit de huidige view en opent een nieuwe (viewid = "view-" + id)
function view(id) {

    var vid = "#view-" + id;

    $(".wrapper").children('.view').hide();
    $(vid).show();
    if (id === 'start') {
        app.startTimer = setInterval(updateStats, 2000);
    } else {
        clearInterval(app.startTimer);
    }
}

// Toont een popup message die na 4 seconden verdwijnt
function popup(message) {
    $(".popup").html(message);
    $(".popup").css('opacity', 1);
    $(".popup").show();
    clearTimeout(app.popupTimer);
    app.popupTimer = setTimeout(hidePopup, 4000);
}

// Verbergt de popup
function hidePopup() {
    $(".popup").animate({
        opacity: 0
    }, 1000, function() {
        $(".popup").hide();
        $(".popup").css('opacity', 1);
    });
}

// Update het aantal online gebruikers en chats (start scherm)
function updateStats() {
    $.getJSON("GhostChatServlet?action=getStats", function(data) {
        $("#chats-created").html(data.stats.chats);
        $("#users-online").html(data.stats.users);
    });
}

// Toggle de locatie aan of uit en update deze (settings scherm)
function onToggleLocation() {
    app.showLocation = !app.showLocation;
    $("#toggle-location").html(app.showLocation ? "On" : "Off");
    updateLocation();
}

// Toggle listed chats (settings scherm)
function onToggleListed() {
    app.listed = !app.listed;
    $("#toggle-listed").html(app.listed ? "On" : "Off");
}

// Update de locatie settings (app.location)
function updateLocation() {

    $("#settings-location-preview").html("");

    if (app.showLocation === true) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, showPositionError);
        }
    }
}

// Update de locatie settings (app.location)
function showPosition(position) {

    // Aan gezien de gebruiker hoogstwaarschijnlijk niet van landen zal veranderen is het voldoende
    // om de locatie maar 1x op de vragen en deze dan verder te gebruiken
    if (app.location.latitude === null || app.location.longitude === null) {
        app.location.latitude = position.coords.latitude;
        app.location.longitude = position.coords.longitude;
        app.location.countryCode = getCountryCodeFromLatAndLong(app.location.latitude, app.location.longitude);
        app.location.country = getCountryFromCountryCode(app.location.countryCode);
    }

    // Toon de google map image (settings scherm) indien de locatie aan staat
    var latlon = app.location.latitude + "," + app.location.longitude;
    var w = Math.round((window.innerWidth * 0.9) - 20);
    var h = Math.round((window.innerHeight * 0.9) - (2 * 70) - (4 * (window.innerHeight / 20)) - 20);
    var img_url = "http://maps.googleapis.com/maps/api/staticmap?center="
            + latlon + "&zoom=15&size=" + w + "x" + h + "&sensor=true";
    $("#settings-location-preview").html("<img src='" + img_url + "'>");

    if (app.started === false) {
        init_initialView();
        app.started = true;
    }
}

// Fout bij ophalen van de locatie / permissie om de gps te gebruiken staat uit 
function showPositionError(error) {

    popup('Could not retrieve geolocation data due to a network error ...');
    app.showLocation = false;

    if (app.started === false) {
        init_initialView();
        app.started = true;
    }
}

// Valideer de group chat input (tekstvelden)
function checkGroupChatInput() {

    app.validating = false;

    var username = $("#view-select-group .input-username").val();
    var chatname = $("#view-select-group .input-chatname").val();
    var regex = /[^a-zA-Z0-9_-]+/;

    if (username.length === 0 || username.length > 32) {
        $(".div-validation").animate({height: 0}, 100);
        popup('Username must be between 1-32 characters');
        return;
    }

    if (chatname.length === 0 || chatname.length > 32) {
        $(".div-validation").animate({height: 0}, 100);
        popup('Chat name must be between 1-32 characters');
        return;
    }

    if (username.search(regex) !== -1) {
        $(".div-validation").animate({height: 0}, 100);
        popup('Username must not contain strange characters');
        return;
    }

    if (chatname.search(regex) !== -1) {
        $(".div-validation").animate({height: 0}, 100);
        popup('Chat name must not contain strange characters');
        return;
    }

    $(".div-validation img").show();
    $(".div-validation div").hide();

    $(".div-validation").animate({
        height: 70
    }, 250, function() {
        app.validating = true;
        checkGroupAvailibility(username, chatname);
    });
}

// Is deze chatnaam en username beschikbaar?
function checkGroupAvailibility(username, chatname) {
    if (app.validating === true) {

        app.username = username;
        app.chatname = chatname;

        $.getJSON("GhostChatServlet?action=checkAvailibility&chatname=" + chatname, onCheckGroupAvailibilityResponse);
    }
}

function onCheckGroupAvailibilityResponse(response) {

    var username = $("#view-select-group .input-username").val();
    var chatname = $("#view-select-group .input-chatname").val();
    if (username !== app.username || chatname !== app.chatname) {
        checkGroupChatInput();
        return;
    }

    if (app.validating === true) {
        $(".div-validation").children('img, div').hide();

        if (response.chat.exists === true) {
            app.chatType = 'join';
            $("#link-group-join").show();
        } else {
            app.chatType = 'create';
            $("#link-group-create").show();
        }

        $(".div-validation").animate({
            height: 70
        }, 250, function() {
            app.validating = false;
        });
        return;
    }

    $(".div-validation").animate({height: 0}, 100);
}

// Idem als bij groups
function checkOneOnOneChatInput() {

    app.validating = false;

    var username = $("#view-select-ono .input-username").val();
    var regex = /[^a-zA-Z0-9_-]+/;

    if (username.length === 0 || username.length > 32) {
        $(".div-validation").animate({height: 0}, 100);
        popup('Username must be between 1-32 characters');
        return;
    }

    if (username.search(regex) !== -1) {
        $(".div-validation").animate({height: 0}, 100);
        popup('Username must not contain strange characters');
        return;
    }
    hidePopup();

    $(".div-validation img").show();
    $(".div-validation div").hide();

    $(".div-validation").animate({
        height: 70
    }, 250, function() {
        app.validating = true;
        checkOneOnOneAvailibility(username);
    });
}

// Idem als bij groups
function checkOneOnOneAvailibility(username) {
    if (app.validating === true) {
        app.username = username;
        onCheckOneOnOneAvailibilityResponse();
    }
}

function onCheckOneOnOneAvailibilityResponse() {

    var username = $("#view-select-ono .input-username").val();
    if (username !== app.username) {
        checkOneOnOneChatInput();
        return;
    }

    if (app.validating === true) {
        $(".div-validation").children('img, div').hide();
        $("#link-ono-join").show();
        $(".div-validation").animate({
            height: 70
        }, 250, function() {
            app.validating = false;
        });
        return;
    }

    $(".div-validation").animate({height: 0}, 100);
}

// Maakt een one-on-one chat aan
function onOneOnOneChatCreate() {
    /*
     *  1. Is there a LISTED chat with 1 person in it?
     *          -> Yes: return chatname, put user in this chat, done
     *          -> No : Continue to (2)
     *  
     *  2. Create a new random chat
     *  3. Make this chat listed
     *  4. Put user in this chat
     *  5. Send server message with info
     *  6. Repeat
     *  7. Profit???
     *      
     */

    view('loading');
    $.getJSON("GhostChatServlet?action=getRandomListedChat", function(data) {
        app.chatname = data.chatname;
        if (data.found === true) {
            app.chatType = 'join';
        } else {
            app.chatType = 'create';
        }
        var tmp = app.listed;   // Remember setting, random chats must be listed
        app.listed = true;
        joinChat();
        app.listed = tmp;       // Restore setting
        return;
    });

}

// Verlaat een chat (group of one-on-one)
function leaveChat() {
    view('loading');
    $.getJSON("GhostChatServlet?action=leaveChat&username=" + app.username, function(data) {
        app.joinedChat = false;
        view('start');
        popup('You left the chat');
        return;
    });
}

// Join een chat (afhankelijk van chat type)
function joinChat() {
    if (app.chatType === 'create') {
        popup('Creating your chat ...');
        $.getJSON("GhostChatServlet?action=createGroupChat&chatname=" + app.chatname + "&ownername=" + app.username + "&country=" + app.location.country + "&showlocation=" + app.showLocation + "&listed=" + app.listed, function(data) {
            enterChat();
        });
    } else {
        $.getJSON("GhostChatServlet?action=usernameExists&chatname=" + app.chatname + "&username=" + app.username, function(data) {
            if (data.usernameexists === false) {
                $.getJSON("GhostChatServlet?action=joinGroupChat&chatname=" + app.chatname + "&ownername=" + app.username + "&country=" + app.location.country + "&showlocation=" + app.showLocation, function(data) {
                    enterChat();
                });
            } else {
                popup('This username already exists in this chat, please pick another one ...');
            }
        });
    }
}

// Ga een chat binnen en start de updates
function enterChat() {
    if (app.joinedChat === false) {
        hidePopup();
        view('chat-group');
        $("#view-chat-group .view-title").html(app.chatname);
        app.chatTimer = setInterval(updateChat, 2000);
        app.lastMessageCount = 0;
        app.lastOnlineUsersCount = 0;
        app.joinedChat = true;
    }
}

// Update berichten en gebruikers in een chat
function updateChat() {

    $.getJSON("GhostChatServlet?action=getChatData&chatname=" + app.chatname + "&username=" + app.username, function(data) {
        $("#chat-online-users").html(data.chat.onlineusers);
        
        // Enkel updaten als er nieuwe berichten zijn
        if (data.chat.messagecount > app.lastMessageCount || data.chat.onlineusers > app.lastOnlineUsersCount) {
            app.lastMessageCount = data.chat.messagecount;
            app.lastOnlineUsersCount = data.chat.onlineusers;
            
            // Scroll helemaal naar beneden om de nieuwe berichten te tonen
            $("#chat-messages-group").animate({
                scrollTop: (window.innerHeight * 0.1) + document.getElementById('chat-messages-group').scrollHeight
            }, 500);

            // Bouw alle berichten op en zet ze in het chat scherm
            var output = '';
            if (data.chat.messagesboxes !== "") {
                var messageboxes = data.chat.messageboxes.messagebox;
                if (Object.getPrototypeOf(messageboxes) === Object.prototype) {
                    messageboxes = Array(messageboxes);
                }
                $.each(messageboxes, function() {

                    output += '<div class="chat-message-block">';
                    output += '<div class="chat-sender"><img src="img/user.png" /> <span>' + this.username + '</span></div>';
                    output += '<div class="chat-timestamp"><span>' + this.timestamp;
                    if (this.haslocation === true) {
                        output += ' from ' + this.location;
                    }
                    output += '</span> <img src="img/timestamp.png" /></div>';

                    var messages = this.messages;
                    if (messages !== "") {
                        if ((typeof messages) === "string") {
                            messages = Array(Object(messages));
                        }

                        output += '<div class="chat-messages">';
                        $.each(messages, function() {
                            output += '<div class="chat-message">' + this + '</div>';
                        });
                        output += '</div>';
                    }
                    output += '</div>';

                });
            }

            $("#chat-messages-group").empty();
            document.getElementById('chat-messages-group').innerHTML = output;
        }
    });

    // Clear de timer als de gebruiker de chat verlaat zodat alle oude berichten verwijderd worden
    if (app.joinedChat === false) {
        $("#chat-messages-group").empty();
        clearInterval(app.chatTimer);
    }
}

// Verstuur een bericht
function sendMessage() {
    var message = $(".chat-controls input").val();
    if (message.length > 0) {
        $(".chat-controls input").val('');  // Maak het tekstveld terug leeg voor het volgende bericht
        $(".chat-controls input").select(); // Selecteer het tekstveld terug voor het volende bericht (gebruiksvriendelijkheid)
        $.getJSON("GhostChatServlet?action=sendMessage&chatname=" + app.chatname + "&username=" + app.username + "&message=" + message, function(data) {
            // Update de chat onmiddelijk voor de gebruiker zodat deze niet hoeft te wachten om zijn eigen bericht te zien
            updateChat();
        });
    }
}

// Toon de gebruikers binnen een chat
function showChatUsers() {

    $.getJSON("GhostChatServlet?action=getChatUsers&chatname=" + app.chatname, function(data) {
        var users = data.user;

        if (Object.getPrototypeOf(users) === Object.prototype) {
            users = Array(users);
        }

        var output = '<table>';
        $.each(users, function() {
            output += '<tr><td>';
            output += '<h2>' + this.username;
            if (app.username === this.username) {
                output += ' (You)';
            }
            output += '</h2>';
            output += '<div class="chat-user-block">';
            output += '<img src="img/user.png" />';
            output += '<p><img src="img/message.png" /> Has been chatting for ' + this.chattime + '</p>';
            if (this.isowner === true) {
                output += '<p style="float: right"><img src="img/star.png" /> Chat owner</p>';
            }
            if (this.haslocation === true) {
                output += '<p><img src="img/gps.png" /> ' + this.location + '</p>';
            }
            output += '</td></tr>';
        });
        output += "</table>";

        $("#chat-users").empty();
        document.getElementById('chat-users').innerHTML = output;
        view('chat-users');
    });
}

// Toon chat informatie
function listChat() {
    alert('\
        Listing your chat means you are allowing \n\
        other people who don\'t explicitly know your \n\
        chat name to join your chat randomly.\n\n\
        \n\
        This means that when someone wants to join a random \n\
        chat, your chat could be selected.\n\n\
        \n\
        If you want your chat to stay private, you should not\n\
        enable this feature!');
}

// Toon alle aangemaakte chats die listen zijn
function showListedChats() {
    $.getJSON("GhostChatServlet?action=getListedChats", function(data) {
        
        if(data.chats !== "") {
        
            var chats = data.chats.chat;
            console.log(data);
            if (Object.getPrototypeOf(chats) === Object.prototype) {
                chats = Array(chats);
            }

            var output = '<table>';
            output += '<tr><td>Chat name</td><td>Online users</td></tr>';
            $.each(chats, function() {
                output += '<tr>';
                output += '<td>' + this.chatname + '</td>';
                output += '<td>' + this.usercount + '</td>';
                output += '</tr>';
            });
            output += "</table>";
            $("#listed-chats").empty();
            document.getElementById('listed-chats').innerHTML = output;
        }
        
        
        view('show-listed');
    });
}