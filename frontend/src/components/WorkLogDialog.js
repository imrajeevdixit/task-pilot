import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logWorkHours } from '../services/api';
import dayjs from 'dayjs';

export default function WorkLogDialog({ open, onClose, ticketKey, ticketSummary }) {
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(dayjs());
  const [error, setError] = useState('');
  
  const queryClient = useQueryClient();
  
  const { mutate, isLoading } = useMutation({
    mutationFn: () => logWorkHours(
      ticketKey, 
      parseFloat(hours), 
      comment, 
      date.format('YYYY-MM-DD')
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard']);
      onClose();
      setHours('');
      setComment('');
      setError('');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hours || isNaN(parseFloat(hours))) {
      setError('Please enter valid hours');
      return;
    }
    mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Log Work - {ticketKey}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <TextField
              label="Hours Worked"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputProps={{ step: 0.5, min: 0 }}
              required
              fullWidth
            />
            
            <DatePicker
              label="Work Date"
              value={date}
              onChange={(newDate) => setDate(dayjs(newDate))}
              maxDate={dayjs()}
              slotProps={{ textField: { fullWidth: true } }}
            />
            
            <TextField
              label="Comment"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the work done..."
              fullWidth
            />
            
            <Typography variant="caption" color="text.secondary">
              Ticket: {ticketSummary}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Logging...
              </>
            ) : (
              'Log Work'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 