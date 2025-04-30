require('dotenv').config();

// Google Calendar API credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '291853215637-7facm7s1kgj6n1jurnog7vp13b8jqc9b.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/auth/google/callback';
const OPENAI_API_KEY = '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';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Google Calendar API setup
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// OpenAI API helper function with retry logic
async function processWithAI(prompt, events = [], updatingEventId = null, availableSlots = [], retryCount = 3) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Extract event type and time from prompt
  const promptLower = prompt.toLowerCase();
  let eventType = 'event';
  if (promptLower.includes('laundry')) eventType = 'laundry';
  else if (promptLower.includes('study')) eventType = 'study session';
  else if (promptLower.includes('meeting')) eventType = 'meeting';
  else if (promptLower.includes('class')) eventType = 'class';
  
  // If we have available slots, create a simple response
  if (availableSlots && availableSlots.length > 0) {
    const suggestions = availableSlots.slice(0, 3).map((slot, index) => {
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);
      const timeStr = `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`;
      
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: `Option ${index + 1}: This time works well for your ${eventType} (${timeStr})`
      };
    });

    return {
      suggestTime: true,
      suggestions: suggestions,
      message: `Here are some available times for your ${eventType}:`
    };
  }
  
  // If no slots available, return appropriate message
  if (!availableSlots || availableSlots.length === 0) {
    return {
      error: true,
      message: promptLower.includes('today') ? 
        "I couldn't find any available time slots for today. Would you like to try tomorrow?" :
        "I couldn't find any available time slots. Would you like to try a different time?"
    };
  }

  // Fallback to OpenAI if above logic doesn't handle the case
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a friendly AI scheduler assistant. Your task is to help schedule ${eventType}s.
            
            Current time: ${new Date().toLocaleString()}
            Available time slots: ${JSON.stringify(availableSlots)}
            Current calendar events: ${JSON.stringify(events)}
            
            IMPORTANT: Always respond with properly formatted JSON.
            
            RESPONSE FORMAT:
            {
              "suggestTime": true,
              "suggestions": [
                {
                  "startTime": "ISO datetime",
                  "endTime": "ISO datetime",
                  "reason": "Brief explanation"
                }
              ],
              "message": "Here are some times for your ${eventType}"
            }`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const aiContent = response.data.choices[0].message.content;
      console.log('AI Response:', aiContent);
      
      try {
        return JSON.parse(aiContent);
      } catch (parseError) {
        console.error('Error parsing AI response as JSON:', parseError);
        // Return the simple response we created earlier as fallback
        return {
          suggestTime: true,
          suggestions: suggestions || [],
          message: `Here are some available times for your ${eventType}:`
        };
      }

    } catch (error) {
      console.error(`OpenAI API Error (Attempt ${attempt}/${retryCount}):`, error.message);
      
      if (attempt === retryCount) {
        // On final retry, return our simple response instead of error
        return {
          suggestTime: true,
          suggestions: suggestions || [],
          message: `Here are some available times for your ${eventType}:`
        };
      }
      
      const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await delay(backoffTime);
    }
  }
}

// Home route with updated UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>AI Student Scheduler</title>
        <style>
          :root {
            --background-color: #1C1C1C;
            --text-color: #E6E6E6;
            --border-color: #333333;
            --input-background: #2A2A2A;
            --accent-color: #007AFF;
            --hover-color: #0056b3;
            --secondary-color: #6C757D;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }

          #schedulerSection {
            display: none;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
          }

          #schedulerSection.visible {
            display: flex;
          }

          .header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: normal;
            color: var(--text-color);
          }

          .container {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 0;
            height: calc(100vh - 70px);
            overflow: hidden;
          }

          .chat-section {
            display: flex;
            flex-direction: column;
            padding: 20px;
            border-right: 1px solid var(--border-color);
            height: 100%;
            overflow: hidden;
          }

          .chat-messages {
            flex-grow: 1;
            overflow-y: auto;
            padding: 10px;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
          }

          .message {
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            max-width: 85%;
            line-height: 1.5;
            word-wrap: break-word;
          }

          .message-content {
            white-space: pre-wrap;
          }

          .user-message {
            background-color: var(--input-background);
            margin-left: auto;
          }

          .ai-message {
            background-color: var(--input-background);
            margin-right: auto;
            border: 1px solid var(--border-color);
          }

          .input-area {
            display: flex;
            gap: 10px;
            padding: 20px;
            border-top: 1px solid var(--border-color);
          }

          #promptInput {
            flex-grow: 1;
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: var(--input-background);
            color: var(--text-color);
            font-size: 16px;
            resize: none;
            min-height: 24px;
            max-height: 200px;
          }

          #promptInput:focus {
            outline: none;
            border-color: var(--accent-color);
          }

          .send-button {
            background-color: transparent;
            border: none;
            color: var(--accent-color);
            cursor: pointer;
            padding: 0 15px;
            font-size: 16px;
          }

          .send-button:hover {
            color: var(--hover-color);
          }

          .events-section {
            background-color: var(--background-color);
            padding: 20px;
            overflow-y: auto;
          }

          .events-section h2 {
            margin-top: 0;
            font-size: 18px;
            font-weight: normal;
            color: var(--text-color);
            margin-bottom: 20px;
          }

          .event-item {
            background-color: var(--input-background);
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
          }

          .event-info {
            margin-bottom: 10px;
          }

          .event-summary {
            color: var(--text-color);
            font-weight: 500;
            margin-bottom: 5px;
          }

          .event-date {
            color: var(--secondary-color);
            font-size: 0.9em;
          }

          .event-actions {
            display: flex;
            gap: 10px;
          }

          .action-button {
            background-color: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .action-button:hover {
            background-color: var(--input-background);
            border-color: var(--accent-color);
          }

          .suggestions-container {
            margin-top: 15px;
          }

          .suggestion-item {
            background-color: var(--input-background);
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border: 1px solid var(--border-color);
          }

          .suggestion-time {
            font-weight: 500;
            color: var(--text-color);
            margin-bottom: 8px;
          }

          .suggestion-reason {
            color: var(--secondary-color);
            margin-bottom: 12px;
            font-size: 0.9em;
          }

          .suggestion-buttons {
            display: flex;
            gap: 10px;
          }

          .schedule-button, .room-button {
            background-color: transparent;
            border: 1px solid var(--accent-color);
            color: var(--accent-color);
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .schedule-button:hover, .room-button:hover {
            background-color: var(--accent-color);
            color: var(--text-color);
          }

          .room-button {
            border-color: var(--secondary-color);
            color: var(--secondary-color);
          }

          .room-button:hover {
            background-color: var(--secondary-color);
          }

          #loginSection {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: var(--background-color);
          }

          .login-button {
            background-color: var(--accent-color);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .login-button:hover {
            background-color: var(--hover-color);
          }

          .hidden {
            display: none;
          }

          /* Scrollbar Styling */
          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: var(--background-color);
          }

          ::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: var(--secondary-color);
          }
        </style>
      </head>
      <body>
        <div id="loginSection">
          <h1>AI Student Scheduler</h1>
          <button class="login-button" onclick="loginWithGoogle()">Login with Google</button>
        </div>

        <div id="schedulerSection" class="hidden">
          <div class="header">
            <h1>What can I help you schedule?</h1>
          </div>
          <div class="container">
            <div class="chat-section">
              <div id="chatMessages" class="chat-messages">
                <div class="message ai-message">
                  Hello! I'm your AI scheduling assistant. How can I help you today?
                </div>
              </div>
              <div class="input-area">
                <textarea 
                  id="promptInput" 
                  placeholder="Type your scheduling request (e.g., 'Schedule a study session for calculus tomorrow afternoon for 2 hours')"
                  onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); processSchedulingRequest(); }"></textarea>
                <button class="send-button" onclick="processSchedulingRequest()">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
            <div class="events-section">
              <h2>Your Calendar</h2>
              <div id="events"></div>
            </div>
          </div>
        </div>

        <script>
          let isAuthenticated = false;
          let lastUserPrompt = '';

          async function loginWithGoogle() {
            try {
              const response = await fetch('/auth/google');
              const data = await response.json();
              console.log('Redirecting to:', data.url);
              window.location.href = data.url;
            } catch (error) {
              console.error('Error:', error);
            }
          }

          function formatTimeRange(startTime, endTime) {
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            const formatTime = (date) => {
              return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
            };
            
            return \`\${formatTime(start)} - \${formatTime(end)}\`;
          }

          function addMessage(content, isUser = false, eventLink = null, suggestions = null, conflict = null) {
            const messagesDiv = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (isUser ? 'user-message' : 'ai-message');
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content || "I'm sorry, I couldn't process that request. Please try again.";
            messageDiv.appendChild(contentDiv);
            
            if (conflict) {
              const conflictDiv = document.createElement('div');
              conflictDiv.className = 'conflict-message';
              const conflictTime = formatTimeRange(conflict.startTime, conflict.endTime);
              conflictDiv.textContent = 'This time conflicts with "' + conflict.summary + '" at ' + conflictTime;
              messageDiv.appendChild(conflictDiv);
            }
            
            if (suggestions && suggestions.length > 0) {
              const suggestionsContainer = document.createElement('div');
              suggestionsContainer.className = 'suggestions-container';
              
              suggestions.forEach((suggestion, index) => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                
                const timeDiv = document.createElement('div');
                timeDiv.className = 'suggestion-time';
                const timeRange = formatTimeRange(suggestion.startTime, suggestion.endTime);
                timeDiv.textContent = 'Option ' + (index + 1) + ': ' + timeRange;
                
                const reasonDiv = document.createElement('div');
                reasonDiv.className = 'suggestion-reason';
                reasonDiv.textContent = suggestion.reason;
                
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'suggestion-buttons';
                
                const calendarButton = document.createElement('button');
                calendarButton.className = 'schedule-button';
                calendarButton.textContent = 'Add to Calendar';
                calendarButton.onclick = () => scheduleSelectedTime(suggestion.startTime, suggestion.endTime);
                
                const roomButton = document.createElement('button');
                roomButton.className = 'room-button';
                roomButton.textContent = 'Add to Calendar & Book Room';
                roomButton.onclick = () => scheduleSelectedTime(suggestion.startTime, suggestion.endTime, true);
                
                buttonContainer.appendChild(calendarButton);
                buttonContainer.appendChild(roomButton);
                
                suggestionItem.appendChild(timeDiv);
                suggestionItem.appendChild(reasonDiv);
                suggestionItem.appendChild(buttonContainer);
                suggestionsContainer.appendChild(suggestionItem);
              });
              
              messageDiv.appendChild(suggestionsContainer);
            }
            
            if (eventLink) {
              const linkButton = document.createElement('a');
              linkButton.href = eventLink;
              linkButton.className = 'event-link-button';
              linkButton.target = '_blank';
              linkButton.textContent = 'View in Calendar';
              messageDiv.appendChild(linkButton);
            }
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }

          async function processSchedulingRequest() {
            const promptInput = document.getElementById('promptInput');
            const prompt = promptInput.value.trim();
            
            if (!prompt) return;
            
            lastUserPrompt = prompt;
            addMessage(prompt, true);
            promptInput.value = '';
            
            try {
              const response = await fetch('/api/process-request', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
              });
              
              const data = await response.json();
              console.log('Received response:', data);
              
              if (data.error) {
                addMessage(data.message || "Sorry, there was an error processing your request.", false);
              } else {
                addMessage(
                  data.response,
                  false,
                  data.eventLink,
                  data.suggestions,
                  data.conflict ? data.conflictingEvent : null
                );
              }
              
              fetchEvents();
            } catch (error) {
              console.error('Error:', error);
              addMessage('Sorry, there was an error processing your request. Please try again.');
            }
          }

          async function fetchEvents() {
            try {
              const response = await fetch('/api/events');
              const events = await response.json();
              const eventsDiv = document.getElementById('events');
              
              if (events.length === 0) {
                eventsDiv.innerHTML = '<p>No upcoming events</p>';
                return;
              }

              const eventsList = events.map((event) => {
                const dateString = new Date(event.start.dateTime || event.start.date).toLocaleString();
                return \`
                  <div class="event-item">
                    <div class="event-info">
                      <div class="event-summary">\${event.summary || 'Untitled Event'}</div>
                      <div class="event-date">\${dateString}</div>
                    </div>
                    <div class="event-actions">
                      <button class="action-button" onclick="updateEvent('\${event.id}', '\${event.summary || 'Untitled Event'}', '\${event.start.dateTime || event.start.date}')" title="Update this event">
                        Update
                      </button>
                      <button class="action-button" onclick="cancelEvent('\${event.id}', '\${event.summary || 'Untitled Event'}')" title="Cancel this event">
                        Cancel
                      </button>
                    </div>
                  </div>
                \`;
              }).join('');

              eventsDiv.innerHTML = eventsList;
            } catch (error) {
              console.error('Error fetching events:', error);
            }
          }

          async function updateEvent(eventId, summary, startTime) {
            const formattedDate = new Date(startTime).toLocaleString();
            const prompt = \`Update my \${summary} event. Please suggest a new time.\`;
            
            addMessage(\`What's the new time for your \${summary} event (currently scheduled for \${formattedDate})?\`, false);
            
            const promptInput = document.getElementById('promptInput');
            promptInput.value = '';
            promptInput.focus();
            
            promptInput.dataset.updatingEventId = eventId;
          }

          async function cancelEvent(eventId, summary) {
            try {
              const prompt = \`Cancel my \${summary} event\`;
              const response = await fetch('/api/process-request', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
              });
              
              const data = await response.json();
              addMessage(data.response, false);
              
              fetchEvents();
            } catch (error) {
              console.error('Error:', error);
              addMessage('Sorry, there was an error cancelling the event. Please try again.');
            }
          }

          async function scheduleSelectedTime(startTime, endTime, bookRoom = false) {
            if (!lastUserPrompt) {
              console.error('No last prompt found');
              addMessage('Sorry, there was an error. Please try your request again.', false);
              return;
            }
            
            if (bookRoom) {
              addMessage('Booking your room...', false);
            } else {
              addMessage('Scheduling your event...', false);
            }
            
            try {
              if (bookRoom) {
                // Simulate room booking delay
                await new Promise(resolve => setTimeout(resolve, 10000));
                addMessage('Your room is booked!', false);
              }

              // Extract event name from prompt
              let eventName = 'Scheduled Event';
              const promptLower = lastUserPrompt.toLowerCase();
              if (promptLower.includes('laundry')) {
                eventName = 'Laundry';
              } else if (promptLower.includes('study')) {
                eventName = 'Study Session';
              } else if (promptLower.includes('meeting')) {
                eventName = 'Meeting';
              } else if (promptLower.includes('class')) {
                eventName = 'Class';
              } else if (promptLower.includes('workout')) {
                eventName = 'Workout';
              } else if (promptLower.includes('appointment')) {
                eventName = 'Appointment';
              }

              const scheduleRequest = {
                createEvent: true,
                eventDetails: {
                  summary: eventName,
                  description: bookRoom ? "Scheduled via AI Assistant - Room booked" : "Scheduled via AI Assistant",
                  start: {
                    dateTime: startTime,
                    timeZone: "America/Los_Angeles"
                  },
                  end: {
                    dateTime: endTime,
                    timeZone: "America/Los_Angeles"
                  }
                }
              };

              const response = await fetch('/api/process-request', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  prompt: lastUserPrompt,
                  selectedTime: { startTime, endTime },
                  directSchedule: scheduleRequest,
                  bookRoom: bookRoom
                })
              });
              
              const data = await response.json();
              if (data.error) {
                addMessage(data.message, false);
              } else {
                if (!bookRoom) {
                  addMessage(data.response || 'Successfully scheduled your event!', false, data.eventLink);
                }
              }
              fetchEvents();
            } catch (error) {
              console.error('Error:', error);
              addMessage('Sorry, there was an error scheduling the event. Please try again.');
            }
          }

          // Check if we're returning from authentication
          if (window.location.search.includes('success=true')) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('schedulerSection').style.display = 'flex';
            document.getElementById('schedulerSection').classList.add('visible');
            fetchEvents();
          }
        </script>
      </body>
    </html>
  `);
});

// Add helper function to check for conflicts
function checkForConflicts(newStart, newEnd, existingEvents) {
  // Convert string dates to Date objects for comparison
  const startTime = new Date(newStart);
  const endTime = new Date(newEnd);
  
  for (const event of existingEvents) {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    
    // Check if there's an overlap
    if ((startTime >= eventStart && startTime < eventEnd) ||
        (endTime > eventStart && endTime <= eventEnd) ||
        (startTime <= eventStart && endTime >= eventEnd)) {
      return {
        hasConflict: true,
        conflictingEvent: {
          summary: event.summary || 'Untitled Event',
          startTime: event.start.dateTime || event.start.date,
          endTime: event.end.dateTime || event.end.date
        }
      };
    }
  }
  
  return { hasConflict: false };
}

// Add helper function to get date boundaries
function getDateBoundaries(dateStr) {
  const date = dateStr.toLowerCase() === 'today' ? new Date() : new Date(dateStr);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return { startOfDay, endOfDay };
}

// Add helper function to filter events for specific day
function filterEventsForDay(events, targetDate) {
  const { startOfDay, endOfDay } = getDateBoundaries(targetDate);
  return events.filter(event => {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    return eventStart >= startOfDay && eventStart <= endOfDay;
  });
}

// Update the findAvailableTimeSlots function to handle dates better
function findAvailableTimeSlots(events, targetDate, durationHours = 2) {
  const slots = [];
  const now = new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(8, 0, 0, 0); // Start at 8 AM
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(21, 0, 0, 0); // End at 9 PM
  
  // If the target date is today and it's already past 8 AM, start from the next hour
  if (startOfDay.toDateString() === now.toDateString() && now.getHours() >= 8) {
    startOfDay.setHours(now.getHours() + 1, 0, 0, 0);
  }
  
  // If start time would be past end time, return empty slots
  if (startOfDay >= endOfDay) {
    return slots;
  }
  
  // Sort events by start time
  const sortedEvents = events.sort((a, b) => 
    new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date)
  );
  
  let currentTime = new Date(startOfDay);
  
  // If no events, add the entire available time range
  if (sortedEvents.length === 0) {
    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000);
      if (slotEnd <= endOfDay) {
        slots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString()
        });
      }
      currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // Move forward by 1 hour
    }
    return slots;
  }
  
  // Find gaps between events
  for (const event of sortedEvents) {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    
    // Skip past events
    if (eventEnd <= currentTime) continue;
    
    // If there's a gap before this event
    if (eventStart > currentTime) {
      const gapDuration = (eventStart - currentTime) / (1000 * 60 * 60); // in hours
      if (gapDuration >= durationHours) {
        slots.push({
          startTime: currentTime.toISOString(),
          endTime: new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000).toISOString()
        });
      }
    }
    
    currentTime = new Date(eventEnd);
  }
  
  // Check for gap after last event
  if (currentTime < endOfDay) {
    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000);
      if (slotEnd <= endOfDay) {
        slots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString()
        });
      }
      currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // Move forward by 1 hour
    }
  }
  
  return slots;
}

// Natural language processing endpoint
app.post('/api/process-request', async (req, res) => {
  try {
    const { prompt, selectedTime, directSchedule, bookRoom, updatingEventId } = req.body;
    
    // If this is a direct scheduling request with selected time
    if (selectedTime && directSchedule) {
      try {
        const createdEvent = await calendar.events.insert({
          calendarId: 'primary',
          resource: {
            ...directSchedule.eventDetails,
            summary: directSchedule.eventDetails.summary || 'Scheduled Event'
          },
          sendUpdates: 'all'
        });

        console.log('Event created:', createdEvent.data);
        
        const eventTime = new Date(selectedTime.startTime).toLocaleTimeString();
        return res.json({ 
          response: bookRoom ? 
            'Event scheduled and room booked successfully!' : 
            'I\'ve scheduled your event for ' + eventTime + '.',
          eventLink: createdEvent.data.htmlLink
        });
      } catch (error) {
        console.error('Error creating event:', error);
        return res.json({
          error: true,
          message: "I had trouble creating the event. Please try again."
        });
      }
    }

    // Extract date from prompt
    let targetDate = new Date();
    if (prompt.toLowerCase().includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (prompt.match(/(\d{1,2}\/\d{1,2})/)) {
      const dateMatch = prompt.match(/(\d{1,2}\/\d{1,2})/);
      targetDate = new Date(dateMatch[1]);
    }
    
    // Get events for the target date
    const timeMin = new Date(targetDate);
    timeMin.setHours(0, 0, 0, 0);
    
    const timeMax = new Date(targetDate);
    timeMax.setHours(23, 59, 59, 999);
    
    let eventsResponse;
    try {
      eventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return res.status(500).json({ 
        error: true,
        message: "I'm having trouble accessing your calendar. Please make sure you're logged in and try again." 
      });
    }

    // Find available time slots
    const availableSlots = findAvailableTimeSlots(eventsResponse.data.items, targetDate);
    console.log('Available slots:', availableSlots);

    // Process with OpenAI
    let aiResponse;
    try {
      aiResponse = await processWithAI(prompt, eventsResponse.data.items, updatingEventId, availableSlots);
      console.log('AI Response:', aiResponse);
    } catch (error) {
      console.error('Error processing with AI:', error);
      // If AI fails, create a simple response with available slots
      if (availableSlots && availableSlots.length > 0) {
        aiResponse = {
          suggestTime: true,
          suggestions: availableSlots.slice(0, 3).map((slot, index) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            reason: `Option ${index + 1}: This time is available`
          })),
          message: "Here are some available times:"
        };
      } else {
        return res.status(500).json({ 
          error: true,
          message: "I couldn't find any available time slots. Would you like to try a different time?" 
        });
      }
    }
    
    // Handle the AI response
    if (aiResponse.error) {
      return res.json(aiResponse);
    }

    // For all other responses, pass them through
    res.json({ 
      response: aiResponse.message,
      suggestions: aiResponse.suggestions,
      conflict: aiResponse.conflict,
      conflictingEvent: aiResponse.conflictingEvent
    });
    
  } catch (error) {
    console.error('Error in request processing:', error);
    res.status(500).json({ 
      error: true,
      message: "Something went wrong. Please try again.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Routes
app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  console.log('Generated auth URL:', authUrl);
  res.json({ url: authUrl });
});

// Handle the OAuth 2.0 callback
app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('Error from Google OAuth:', error);
    return res.send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Error: ${error}</p>
          <p>Please make sure the redirect URI (http://localhost:8000/auth/google/callback) is registered in the Google Cloud Console.</p>
          <a href="/">Try Again</a>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('No authorization code received');
  }

  console.log('Received callback with code:', code);
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('Successfully obtained tokens');
    
    // Redirect to the main page or dashboard
    res.redirect('/?success=true');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Error: ${error.message}</p>
          <a href="/">Try Again</a>
        </body>
      </html>
    `);
  }
});

// Get calendar events
app.get('/api/events', async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.json(response.data.items);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new event
app.post('/api/events', async (req, res) => {
  try {
    const event = req.body;
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI scheduling suggestion endpoint
app.post('/api/suggest-schedule', async (req, res) => {
  try {
    const { tasks, preferences } = req.body;
    // TODO: Implement AI scheduling logic
    const suggestions = generateScheduleSuggestions(tasks, preferences);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function for AI scheduling (placeholder)
function generateScheduleSuggestions(tasks, preferences) {
  // This is a placeholder for the AI scheduling logic
  // In a real implementation, this would use machine learning or optimization algorithms
  return tasks.map(task => ({
    ...task,
    suggestedTime: new Date(Date.now() + Math.random() * 86400000),
    priority: Math.random() > 0.5 ? 'high' : 'medium'
  }));
}

// Add delete event endpoint
app.delete('/api/events/:eventId', async (req, res) => {
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: req.params.eventId,
      sendUpdates: 'all'
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add patch endpoint for updating events
app.patch('/api/events/:eventId', async (req, res) => {
  try {
    const updatedEvent = await calendar.events.patch({
      calendarId: 'primary',
      eventId: req.params.eventId,
      resource: req.body,
      sendUpdates: 'all'
    });
    res.json(updatedEvent.data);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Redirect URI set to: ${GOOGLE_REDIRECT_URI}`);
}); 