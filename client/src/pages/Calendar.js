import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    start: {
      dateTime: new Date().toISOString(),
    },
    end: {
      dateTime: new Date().toISOString(),
    },
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleEventSubmit = async () => {
    try {
      await axios.post('http://localhost:5000/api/events', newEvent);
      handleCloseDialog();
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Calendar
        </Typography>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateCalendar
              value={selectedDate}
              onChange={handleDateChange}
            />
          </LocalizationProvider>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Events for {selectedDate.toLocaleDateString()}
            </Typography>
            <Button
              variant="contained"
              onClick={handleOpenDialog}
            >
              Add Event
            </Button>
          </Box>
          <Box>
            {getEventsForDate(selectedDate).map(event => (
              <Paper
                key={event.id}
                sx={{ p: 1, mb: 1, backgroundColor: 'primary.light', color: 'white' }}
              >
                <Typography variant="subtitle1">{event.summary}</Typography>
                <Typography variant="body2">
                  {new Date(event.start.dateTime).toLocaleTimeString()} - 
                  {new Date(event.end.dateTime).toLocaleTimeString()}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Event</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Title"
            fullWidth
            value={newEvent.summary}
            onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={newEvent.description}
            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Start Time"
            type="datetime-local"
            fullWidth
            value={newEvent.start.dateTime}
            onChange={(e) => setNewEvent({
              ...newEvent,
              start: { dateTime: e.target.value },
            })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="dense"
            label="End Time"
            type="datetime-local"
            fullWidth
            value={newEvent.end.dateTime}
            onChange={(e) => setNewEvent({
              ...newEvent,
              end: { dateTime: e.target.value },
            })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleEventSubmit} variant="contained">
            Add Event
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

export default Calendar; 