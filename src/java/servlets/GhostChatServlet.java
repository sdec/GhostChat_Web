package servlets;

import com.ghostchat.facade.ChatFacade;
import com.ghostchat.model.Chat;
import com.ghostchat.model.ChatComparator;
import com.ghostchat.model.Message;
import com.ghostchat.model.MessageBox;
import com.ghostchat.model.User;
import java.io.IOException;
import java.io.PrintWriter;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.XML;

@WebServlet(name = "GhostChatServlet", urlPatterns = {"/GhostChatServlet"})
public class GhostChatServlet extends HttpServlet {

    private ChatFacade facade;
    
    @Override
    public void init() {
        facade = new ChatFacade();
    }
    
    @Override
    public void destroy() {
        facade = null;
    }

    
    /**
     * Ghost Chat Servlet
     * Deze servlet gebruikt requests om in het model data op te vragen.
     * Data wordt terug gestuurd IN JSON FORMAAT (geconverteerd van XML).
     * 
     * URL van de Servlet op Jelastic:
     * http://env-0432771.jelastic.dogado.eu/GhostChat/GhostChatServlet
     * 
     * Functie oproepen gebreurt door de naam mee te geven als actie
     *  (zie mogelijke acties hieronder)
     * 
     * Voorbeeld:
     * http://env-0432771.jelastic.dogado.eu/GhostChat/GhostChatServlet?action=getStats
     * (= geeft stats terug van online gebruikers en chats)
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {

        String action = request.getParameter("action");
        String output = "";
        if (action != null) {

            if (action.equals("getStats")) {
                output += "<stats>";
                output += "<users>" + facade.countTotalUsers() + "</users>";
                output += "<chats>" + facade.countTotalChats() + "</chats>";
                output += "</stats>";
            }

            else if (action.equals("checkAvailibility")) {
                String chatname = request.getParameter("chatname");
                output += "<chat>";
                output += "<exists>" + facade.chatExists(chatname) + "</exists>";
                output += "</chat>";
            }

            else if (action.equals("createGroupChat")) {
                String chatname = request.getParameter("chatname");
                String ownername = request.getParameter("ownername");
                String country = request.getParameter("country");
                boolean showLocation = Boolean.parseBoolean(request.getParameter("showlocation"));
                boolean listed = Boolean.parseBoolean(request.getParameter("listed"));
                facade.createGroupChat(chatname, listed, ownername, "", country, showLocation);
                facade.addUserToGroupChat(chatname, ownername, "", country, showLocation);
            }

            else if (action.equals("usernameExists")) {
                String chatname = request.getParameter("chatname");
                String username = request.getParameter("username");
                output += "<usernameexists>" + facade.isUserInChat(chatname, username) + "</usernameexists>";
            }
            
            else if (action.equals("joinGroupChat")) {
                String chatname = request.getParameter("chatname");
                String ownername = request.getParameter("ownername");
                String country = request.getParameter("country");
                boolean showLocation = Boolean.parseBoolean(request.getParameter("showlocation"));
                facade.addUserToGroupChat(chatname, ownername, "", country, showLocation);
            }
            
            else if (action.equals("leaveChat")) {
                String username = request.getParameter("username");
                facade.removeUserFromChat(username);
            }
            
            else if (action.equals("getChatData")) {
                String chatname = request.getParameter("chatname");
                output += "<chat>";
                output += "<onlineusers>" + facade.countChatUsers(chatname) + "</onlineusers>";
                output += "<messagecount>" + facade.countChatMessages(chatname) + "</messagecount>";
                output += "<messageboxes>";

                for (MessageBox box : facade.getMessageBoxes(chatname)) {

                    Date time = new Date(box.sendtime);
                    DateFormat timef = new SimpleDateFormat("HH:mm:ss");
                    String timeString = timef.format(time);

                    output += "<messagebox>";
                    output += "<username>" + box.user.getUsername() + "</username>";
                    output += "<timestamp>" + timeString + "</timestamp>";
                    for (Message message : box.messages) {
                        output += "<messages>" + message.getMessage() + "</messages>";
                    }
                    output += "<haslocation>" + box.user.hasLocation() + "</haslocation>";
                    if(box.user.hasLocation()) {
                        output += "<location>" + box.user.getLocation().getCountry() + "</location>";
                    }
                    output += "</messagebox>";
                }
                output += "</messageboxes>";
                output += "</chat>";
            }
            
            else if(action.equals("sendMessage")) {
                String chatname = request.getParameter("chatname");
                String username = request.getParameter("username");
                String message = request.getParameter("message");
                facade.sendMessage(chatname, username, message);
            }
            
            else if(action.equals("getChatUsers")) {
                String chatname = request.getParameter("chatname");
                List<User> users = facade.getUsers(chatname);
                User owner = facade.getChatOwner(chatname);
                
                for(User user : users) {
                    output += "<user>";
                    
                    Date now = new Date();
                    Date time = new Date(now.getTime() - user.getJoined());
                    DateFormat timef = new SimpleDateFormat("HH:mm:ss");
                    String timeString = timef.format(time);
                    
                    output += "<username>" + user.getUsername() + "</username>";
                    output += "<chattime>" + timeString + "</chattime>";
                    output += "<isowner>" + owner.equals(user) + "</isowner>";
                    output += "<haslocation>" + user.hasLocation() + "</haslocation>";
                    if(user.hasLocation()) {
                        output += "<location>" + user.getLocation().getCountry() + "</location>";
                    }
                    output += "</user>";
                }
            }
            
            else if(action.equals("getRandomListedChat")) {
                List<Chat> chats = facade.getChats();
                boolean found = false;
                for(Chat chat : chats) {
                    if(chat.isListed() && chat.countUsers() == 1) {
                        output += "<chatname>" + chat.getName() + "</chatname>";
                        found = true;
                        break;
                    }
                }
                if(found == false) {
                    output += "<chatname>" + facade.generateChatName() + "</chatname>";
                }
                output += "<found>" + found + "</found>";
            }
            
            else if(action.equals("getListedChats")) {
                List<Chat> chats = facade.getChats();
                List<Chat> listedChats = new ArrayList<Chat>();
                for(Chat chat : chats) {
                    if(chat.isListed()) {
                        listedChats.add(chat);
                    }
                }
                
                // Sorteer de lijst op users online in de chat, zie compareTo van chats
                Collections.sort(listedChats, new ChatComparator());
                
                output += "<chats>";
                for(Chat c : listedChats) {
                    output += "<chat>";
                    output += "<chatname>" + c.getName() + "</chatname>";
                    output += "<usercount>" + c.getUsers().size() + "</usercount>";
                    output += "</chat>";
                }
                output += "</chats>";
            }
        }

        try {
            JSONObject xmlJSONObj = XML.toJSONObject(output);
            PrintWriter writer = response.getWriter();
            writer.write(xmlJSONObj.toString());
        } catch (JSONException je) {}
    }
}
