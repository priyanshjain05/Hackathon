import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Box,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Event as EventIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import axios from 'axios';

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Fetch events and tasks from the backend
    const fetchData = async () => {
      try {
        const eventsResponse = await axios.get('http://localhost:5000/api/events');
        setEvents(eventsResponse.data);
        // TODO: Implement tasks fetching
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Welcome to your AI Scheduler
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Upcoming Events</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
            >
              Add Event
            </Button>
          </Box>
          <List>
            {events.map((event, index) => (
              <React.Fragment key={event.id}>
                <ListItem>
                  <ListItemIcon>
                    <EventIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={event.summary}
                    secondary={new Date(event.start.dateTime).toLocaleString()}
                  />
                </ListItem>
                {index < events.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Tasks</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
            >
              Add Task
            </Button>
          </Box>
          <List>
            {tasks.map((task, index) => (
              <React.Fragment key={task.id}>
                <ListItem>
                  <ListItemIcon>
                    <AssignmentIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={task.dueDate}
                  />
                </ListItem>
                {index < tasks.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            AI Suggestions
          </Typography>
          <Typography variant="body1">
            Your AI assistant is analyzing your schedule and will provide personalized suggestions
            for optimal study times and task prioritization.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default Dashboard; 