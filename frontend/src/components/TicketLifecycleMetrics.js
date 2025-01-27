import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Grid,
    LinearProgress,
    Link,
    Paper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { getWorkLogs } from '../services/api';
import ProjectDistributionChart from './ProjectDistributionChart';
import WorkLogDialog from './WorkLogDialog';

const JIRA_BASE_URL = 'https://truworth.atlassian.net/browse';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`metrics-tabpanel-${index}`}
      aria-labelledby={`metrics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function TicketLifecycleMetrics({ 
  tickets = [], 
  performanceMetrics = {}, 
  lifecycleTrends, 
  selectedEngineer,
  timeRange,
  engineersData = {}
}) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState('completion');
  const [selectedView, setSelectedView] = useState('hours');
  const [workLogDialog, setWorkLogDialog] = useState({
    open: false,
    ticketKey: null,
    ticketSummary: null
  });
  const [workLogs, setWorkLogs] = useState({});
  const [isLoadingWorkLogs, setIsLoadingWorkLogs] = useState(false);

  // Get date range based on timeRange
  const getDateRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch(timeRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '1m':
        start.setDate(end.getDate() - 30);
        break;
      case '3m':
        start.setDate(end.getDate() - 90);
        break;
      case '6m':
        start.setDate(end.getDate() - 180);
        break;
      case 'all':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }, [timeRange]);

  // Filter tickets based on date range
  const dateFilteredTickets = React.useMemo(() => {
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created);
      return ticketDate >= getDateRange.start && ticketDate <= getDateRange.end;
    });
  }, [tickets, getDateRange]);

  // Fetch work logs when date range or filtered tickets change
  useEffect(() => {
    const fetchWorkLogs = async () => {
      setIsLoadingWorkLogs(true);
      try {
        const response = await getWorkLogs({
          ticketKeys: dateFilteredTickets.map(ticket => ticket.key),
          assignee: selectedEngineer,
          startDate: getDateRange.start.toISOString(),
          endDate: getDateRange.end.toISOString()
        });
        if (response.success) {
          setWorkLogs(response.data);
        }
      } catch (error) {
        console.error('Error fetching work logs:', error);
      } finally {
        setIsLoadingWorkLogs(false);
      }
    };

    fetchWorkLogs();
  }, [dateFilteredTickets, getDateRange, selectedEngineer]);

  // Calculate daily work from work logs
  const calculateDailyWork = React.useMemo(() => {
    if (!lifecycleTrends?.daily_trends) {
      console.log('No daily trends data available');
      return {};
    }
    
    console.log('Lifecycle trends:', lifecycleTrends);
    
    const dailyWork = {};
    
    Object.entries(lifecycleTrends.daily_trends)
      .filter(([date]) => {
        const trendDate = new Date(date);
        const isInRange = trendDate >= getDateRange.start && trendDate <= getDateRange.end;
        console.log(`Date ${date} in range: ${isInRange}`);
        return isInRange;
      })
      .forEach(([date, data]) => {
        console.log(`Processing date ${date}:`, data);
        
        if (!data.work_logs) {
          console.log(`No work logs for date ${date}`);
          return;
        }
        
        // Filter work logs for selected engineer
        const engineerLogs = selectedEngineer 
          ? data.work_logs.filter(log => log.author === selectedEngineer)
          : data.work_logs;
        
        console.log('Filtered engineer logs:', engineerLogs);
        
        if (engineerLogs.length > 0) {
          dailyWork[date] = {
            totalHours: engineerLogs.reduce((sum, log) => sum + (log.hours || 0), 0),
            tickets: new Set(engineerLogs.map(log => log.ticket_key)),
            details: engineerLogs.map(log => ({
              ticket: log.ticket_key,
              summary: log.summary,
              hours: log.hours || 0,
              comment: log.comment,
              status: log.status,
              project: log.project
            }))
          };
          console.log(`Daily work for ${date}:`, dailyWork[date]);
        }
      });
    
    console.log('Final daily work data:', dailyWork);
    return dailyWork;
  }, [lifecycleTrends, selectedEngineer, getDateRange]);

  // Calculate engineer-specific performance metrics
  const engineerMetrics = React.useMemo(() => {
    if (!selectedEngineer) return performanceMetrics;
    
    const dailyWork = calculateDailyWork;
    const totalDays = Object.keys(dailyWork).length || 1; // Avoid division by zero
    
    return {
      avg_time_to_start: tickets.reduce((acc, t) => acc + t.time_to_start, 0) / (tickets.length || 1),
      avg_time_to_complete: tickets.reduce((acc, t) => acc + t.time_to_complete, 0) / (tickets.length || 1),
      in_progress_tickets: tickets.filter(t => t.status === 'In Progress').length,
      completed_tickets: tickets.filter(t => ['Done', 'Closed'].includes(t.status)).length,
      avg_daily_work_hours: Object.values(dailyWork).reduce((acc, day) => acc + day.totalHours, 0) / totalDays,
      avg_daily_tickets: Object.values(dailyWork).reduce((acc, day) => acc + day.tickets.size, 0) / totalDays
    };
  }, [tickets, selectedEngineer, performanceMetrics, calculateDailyWork]);

  // Filter tickets for the selected engineer
  const engineerTickets = React.useMemo(() => {
    if (!selectedEngineer) return tickets;
    return tickets.filter(ticket => ticket.assignee === selectedEngineer);
  }, [tickets, selectedEngineer]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (hours) => {
    if (!hours) return '0h';
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (days === 0) return `${remainingHours}h`;
    return `${days}d ${remainingHours}h`;
  };

  const calculateProgress = (logged, estimate) => {
    if (!estimate || !logged) return 0;
    return Math.min(Math.round((logged / estimate) * 100), 100);
  };

  const CURRENT_STATUSES = ['To Do', 'Start', 'In Progress', 'In Review', 'Blocked', 'Hold'];

  // Update the currentTickets useMemo to filter by selectedEngineer
  const currentTickets = React.useMemo(() => {
    return tickets
      .filter(ticket => 
        CURRENT_STATUSES.includes(ticket.status) &&
        (!selectedEngineer || ticket.assignee === selectedEngineer) // Add assignee filter
      )
      .sort((a, b) => new Date(b.updated) - new Date(a.updated));
  }, [tickets, CURRENT_STATUSES, selectedEngineer]); // Add selectedEngineer to dependencies

  // Update the completedTickets useMemo to filter by selectedEngineer
  const completedTickets = React.useMemo(() => 
    dateFilteredTickets
      .filter(t => 
        ['Done', 'Closed'].includes(t.status) &&
        (!selectedEngineer || t.assignee === selectedEngineer) // Add assignee filter
      )
  , [dateFilteredTickets, selectedEngineer]); // Add selectedEngineer to dependencies

  const lifecycleData = [
    {
      name: 'Time to Start',
      value: performanceMetrics.avg_time_to_start
    },
    {
      name: 'Time to Complete',
      value: performanceMetrics.avg_time_to_complete
    }
  ];

  const calculateEfficiency = (estimate, logged) => {
    // Return 'N/A' if no estimate
    if (!estimate) return 'N/A';
    
    // Return '0%' if no time logged
    if (!logged) return '0%';
    
    // Calculate efficiency as percentage
    const efficiency = (estimate / logged) * 100;
    
    // Handle extreme cases
    if (efficiency > 200) return '>200%';
    if (efficiency < 0) return '0%';
    
    return `${Math.round(efficiency)}%`;
  };

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'in progress':
        return '#1976d2'; // blue
      case 'blocked':
        return '#d32f2f'; // red
      case 'hold':
        return '#ed6c02'; // orange
      case 'in review':
        return '#9c27b0'; // purple
      case 'to do':
        return '#757575'; // grey
      case 'start':
        return '#2e7d32'; // green
      default:
        return '#757575'; // default grey
    }
  };

  // Transform and filter trends data for the selected engineer
  const chartData = React.useMemo(() => {
    if (!lifecycleTrends?.daily_trends) return [];

    return Object.entries(lifecycleTrends.daily_trends)
      .filter(([date]) => {
        const trendDate = new Date(date);
        return trendDate >= getDateRange.start && trendDate <= getDateRange.end;
      })
      .map(([date, data]) => {
        // If no engineer selected, use total data
        if (!selectedEngineer) {
          return {
            date: new Date(date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            }),
            completion: data.completion_hours,
            available: data.available_hours,
            variance: data.variance,
            active: data.active_tasks
          };
        }

        // Filter data for selected engineer
        const engineerTicketsForDay = engineerTickets.filter(ticket => {
          const ticketDate = new Date(ticket.created).toISOString().split('T')[0];
          return ticketDate === date;
        });

        const completion = engineerTicketsForDay.reduce((acc, ticket) => 
          acc + (ticket.time_to_complete || 0), 0);

        return {
          date: new Date(date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          }),
          completion: completion,
          available: 8, // 8 hours per day for individual engineer
          variance: completion > 0 ? ((completion - 8) / 8) * 100 : -100,
          active: engineerTicketsForDay.length
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [lifecycleTrends, selectedEngineer, engineerTickets, getDateRange]);

  // Calculate work hours based on status transitions
  const calculateWorkHours = (ticket) => {
    const statusChanges = ticket.changelog?.filter(log => 
      log.field === 'status' && 
      ['In Progress', 'In Review'].includes(log.toString)
    );

    if (!statusChanges?.length) return 0;

    let totalHours = 0;
    statusChanges.forEach(change => {
      const startTime = new Date(change.created);
      const nextChange = ticket.changelog.find(log => 
        log.field === 'status' && 
        log.created > change.created && 
        !['In Progress', 'In Review'].includes(log.toString)
      );
      
      const endTime = nextChange ? new Date(nextChange.created) : new Date();
      const hours = (endTime - startTime) / (1000 * 60 * 60);
      
      // Cap at 8 hours per day and exclude non-working hours
      totalHours += Math.min(getWorkingHours(hours), 8);
    });

    return totalHours;
  };

  // Calculate working hours excluding nights and weekends
  const getWorkingHours = (totalHours) => {
    const WORK_START_HOUR = 9; // 9 AM
    const WORK_END_HOUR = 17; // 5 PM
    
    let workingHours = 0;
    let currentDate = new Date();
    
    for (let hour = 0; hour < totalHours; hour++) {
      const hourOfDay = (WORK_START_HOUR + hour) % 24;
      const isWorkingHour = hourOfDay >= WORK_START_HOUR && hourOfDay < WORK_END_HOUR;
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      if (isWorkingHour && !isWeekend) {
        workingHours++;
      }
    }
    
    return workingHours;
  };

  const renderDailyWorkDetails = () => {
    if (isLoadingWorkLogs) {
      return (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      );
    }

    const entries = Object.entries(workLogs);
    
    if (entries.length === 0) {
      return (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Daily Work Details
          </Typography>
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            No work logs found for the selected {selectedEngineer ? 'engineer and ' : ''}time range
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Daily Work Details
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Hours Worked</TableCell>
                <TableCell>Tickets</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries
                .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                .map(([date, data]) => (
                  <TableRow key={date}>
                    <TableCell>{formatDate(date)}</TableCell>
                    <TableCell>{data.total_hours.toFixed(1)}h</TableCell>
                    <TableCell>
                      {data.tickets.map(ticket => (
                        <Link
                          key={ticket}
                          href={`${JIRA_BASE_URL}/${ticket}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ mr: 1 }}
                        >
                          {ticket}
                        </Link>
                      ))}
                    </TableCell>
                    <TableCell>
                      {data.logs.map((log, idx) => (
                        <Typography key={idx} variant="caption" display="block">
                          {log.ticket_key}: {log.hours}h - {log.summary}
                          {log.comment && (
                            <Typography 
                              component="span" 
                              color="text.secondary" 
                              sx={{ ml: 1, fontSize: 'inherit' }}
                            >
                              ({log.comment.replace(/\[work:.*?\]/, '').trim()})
                            </Typography>
                          )}
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No trend data available for the selected time range
          </Typography>
        </Box>
      );
    }

    switch(selectedMetric) {
      case 'completion':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <Box sx={{ 
                      bgcolor: 'background.paper', 
                      p: 1, 
                      border: 1, 
                      borderColor: 'grey.300',
                      borderRadius: 1
                    }}>
                      <Typography variant="body2">{label}</Typography>
                      {payload.map((entry, index) => (
                        <Typography 
                          key={index} 
                          variant="body2" 
                          sx={{ color: entry.color }}
                        >
                          {`${entry.name}: ${selectedView === 'hours' 
                            ? `${entry.value.toFixed(1)}h` 
                            : `${entry.value.toFixed(1)}%`}`}
                        </Typography>
                      ))}
                    </Box>
                  );
                }}
              />
              <Legend />
              {selectedView === 'hours' ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="completion" 
                    name="Completion Hours" 
                    stroke="#82ca9d" 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="available" 
                    name="Available Hours" 
                    stroke="#8884d8" 
                    dot={false}
                  />
                </>
              ) : (
                <Line 
                  type="monotone" 
                  dataKey="variance" 
                  name="Variance %" 
                  stroke="#ff7300" 
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'projects':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <Box sx={{ 
                      bgcolor: 'background.paper', 
                      p: 1, 
                      border: 1, 
                      borderColor: 'grey.300',
                      borderRadius: 1
                    }}>
                      <Typography variant="body2">{label}</Typography>
                      {payload.map((entry, index) => (
                        <Typography 
                          key={index} 
                          variant="body2" 
                          sx={{ color: entry.color }}
                        >
                          {`${entry.name}: ${selectedView === 'hours' 
                            ? `${entry.value.toFixed(1)}h` 
                            : `${entry.value.toFixed(1)}%`}`}
                        </Typography>
                      ))}
                    </Box>
                  );
                }}
              />
              <Legend />
              {lifecycleTrends.projects.map((project, index) => (
                <Area
                  key={project}
                  type="monotone"
                  dataKey={`${project}_${selectedView}`}
                  name={project}
                  stackId="1"
                  stroke={`hsl(${index * 137.5}, 70%, 50%)`}
                  fill={`hsl(${index * 137.5}, 70%, 70%)`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Ticket Lifecycle Metrics {selectedEngineer ? `- ${selectedEngineer}` : ''}
        </Typography>

        <Tabs 
          value={selectedTab} 
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="Overview" />
          <Tab label={`Current Tasks (${currentTickets.length})`} />
          <Tab label={`Completed Tasks (${completedTickets.length})`} />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {selectedTab === 0 && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 2 }}>
                <ToggleButtonGroup
                  value={selectedMetric}
                  exclusive
                  onChange={(_, value) => value && setSelectedMetric(value)}
                  size="small"
                >
                  <ToggleButton value="completion">Completion Trends</ToggleButton>
                  <ToggleButton value="projects">Project Distribution</ToggleButton>
                </ToggleButtonGroup>

                <ToggleButtonGroup
                  value={selectedView}
                  exclusive
                  onChange={(_, value) => value && setSelectedView(value)}
                  size="small"
                  sx={{ ml: 2 }}
                >
                  <ToggleButton value="hours">Hours</ToggleButton>
                  <ToggleButton value="percentage">Percentage</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ flex: 1, minHeight: 400 }}>
                {selectedMetric === 'completion' ? (
                  renderChart()
                ) : (
                  <ProjectDistributionChart 
                    currentTickets={currentTickets}
                    completedTickets={completedTickets}
                    selectedEngineer={selectedEngineer}
                  />
                )}
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Performance Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Avg Time to Start
                    </Typography>
                    <Typography>
                      {formatDuration(engineerMetrics.avg_time_to_start)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Avg Time to Complete
                    </Typography>
                    <Typography>
                      {formatDuration(engineerMetrics.avg_time_to_complete)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Current Tasks
                    </Typography>
                    <Typography>
                      {engineerMetrics.in_progress_tickets}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Completed Tasks
                    </Typography>
                    <Typography>
                      {engineerMetrics.completed_tickets}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {renderDailyWorkDetails()}
            </Box>
          )}

          {selectedTab === 1 && (
            <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
              <TableContainer 
                component={Paper} 
                sx={{ 
                  maxHeight: '100%',
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'background.paper',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'grey.400',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'grey.500',
                    },
                  },
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Ticket</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Summary</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Status</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Estimate</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Time Logged</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Progress</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentTickets.map(ticket => (
                      <TableRow key={ticket.key}>
                        <TableCell>
                          <Link 
                            href={`${JIRA_BASE_URL}/${ticket.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textDecoration: 'none' }}
                          >
                            {ticket.key}
                          </Link>
                        </TableCell>
                        <TableCell>{ticket.summary}</TableCell>
                        <TableCell>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              backgroundColor: getStatusColor(ticket.status),
                              color: 'white',
                              fontSize: '0.875rem'
                            }}
                          >
                            {ticket.status}
                          </Box>
                        </TableCell>
                        <TableCell>{formatDuration(ticket.estimate)}</TableCell>
                        <TableCell>{formatDuration(ticket.logged)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={calculateProgress(ticket.logged, ticket.estimate)}
                              sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="caption">
                              {calculateProgress(ticket.logged, ticket.estimate)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => setWorkLogDialog({
                              open: true,
                              ticketKey: ticket.key,
                              ticketSummary: ticket.summary
                            })}
                          >
                            Log Work
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TableContainer>
          )}

          {selectedTab === 2 && (
            <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
              <TableContainer 
                component={Paper}
                sx={{ 
                  maxHeight: '100%',
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'background.paper',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'grey.400',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'grey.500',
                    },
                  },
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Ticket</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Summary</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Time to Start</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Time to Complete</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>
                        <Tooltip title="Ratio of estimated time to actual time taken">
                          <span>Efficiency</span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {completedTickets.map(ticket => (
                      <TableRow key={ticket.key}>
                        <TableCell>
                          <Link 
                            href={`${JIRA_BASE_URL}/${ticket.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textDecoration: 'none' }}
                          >
                            {ticket.key}
                          </Link>
                        </TableCell>
                        <TableCell>{ticket.summary}</TableCell>
                        <TableCell>{formatDuration(ticket.time_to_start)}</TableCell>
                        <TableCell>{formatDuration(ticket.time_to_complete)}</TableCell>
                        <TableCell>
                          {calculateProgress(ticket.estimate, ticket.logged)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TableContainer>
          )}
        </Box>
      </CardContent>
      <WorkLogDialog
        open={workLogDialog.open}
        onClose={() => setWorkLogDialog({ open: false, ticketKey: null, ticketSummary: null })}
        ticketKey={workLogDialog.ticketKey}
        ticketSummary={workLogDialog.ticketSummary}
      />
    </Card>
  );
} 