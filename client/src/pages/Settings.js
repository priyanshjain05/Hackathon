import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Alert,
} from '@mui/material';
import axios from 'axios';

function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    autoSchedule: true,
    studyTimePreferences: {
      morning: true,
      afternoon: true,
      evening: true,
    },
    breakDuration: 15,
    maxStudySessionDuration: 120,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const handleGoogleConnect = async () => {
    try {
      const response = await axios.get('http://localhost:5000/auth/google');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error connecting to Google:', error);
    }
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleStudyTimePreferenceChange = (timeSlot, value) => {
    setSettings(prev => ({
      ...prev,
      studyTimePreferences: {
        ...prev.studyTimePreferences,
        [timeSlot]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    try {
      // TODO: Implement settings save to backend
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Google Calendar Integration
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleGoogleConnect}
              disabled={isConnected}
            >
              {isConnected ? 'Connected to Google Calendar' : 'Connect Google Calendar'}
            </Button>
          </Box>
          {showAlert && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Settings saved successfully!
            </Alert>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              />
            }
            label="Enable Notifications"
          />
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Study Preferences
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSchedule}
                    onChange={(e) => handleSettingChange('autoSchedule', e.target.checked)}
                  />
                }
                label="Enable AI Auto-Scheduling"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Preferred Study Times
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.studyTimePreferences.morning}
                    onChange={(e) => handleStudyTimePreferenceChange('morning', e.target.checked)}
                  />
                }
                label="Morning (6 AM - 12 PM)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.studyTimePreferences.afternoon}
                    onChange={(e) => handleStudyTimePreferenceChange('afternoon', e.target.checked)}
                  />
                }
                label="Afternoon (12 PM - 6 PM)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.studyTimePreferences.evening}
                    onChange={(e) => handleStudyTimePreferenceChange('evening', e.target.checked)}
                  />
                }
                label="Evening (6 PM - 12 AM)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Break Duration (minutes)"
                value={settings.breakDuration}
                onChange={(e) => handleSettingChange('breakDuration', parseInt(e.target.value))}
                InputProps={{ inputProps: { min: 5, max: 60 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Study Session Duration (minutes)"
                value={settings.maxStudySessionDuration}
                onChange={(e) => handleSettingChange('maxStudySessionDuration', parseInt(e.target.value))}
                InputProps={{ inputProps: { min: 30, max: 240 } }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
          >
            Save Settings
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

export default Settings; 