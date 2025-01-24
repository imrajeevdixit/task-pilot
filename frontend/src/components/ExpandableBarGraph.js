import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Collapse,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ExpandableBarGraph({ data }) {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const formatData = (engineersData) => {
    return Object.entries(engineersData).map(([engineer, metrics]) => ({
      name: engineer,
      'Estimated Hours': Number((metrics.total_estimate).toFixed(2)),
      'Logged Hours': Number((metrics.total_logged).toFixed(2)),
      'Current Work': Number((metrics.current_work).toFixed(2)),
      'Idle Time': Number((metrics.idle_time).toFixed(2))
    }));
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChartIcon color="primary" />
            <Typography variant="h6">
              Team Performance Overview
            </Typography>
          </Box>
          <IconButton
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show graph"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ height: 400, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formatData(data)}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Estimated Hours" fill="#8884d8" />
                <Bar dataKey="Logged Hours" fill="#82ca9d" />
                <Bar dataKey="Current Work" fill="#ffc658" />
                <Bar dataKey="Idle Time" fill="#ff8042" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
} 