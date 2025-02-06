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
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { getWorkLogs } from '../services/api';
import ProjectDistributionChart from './ProjectDistributionChart';
import WorkLogDialog from './WorkLogDialog';

const JIRA_BASE_URL = 'https://truworth.atlassian.net/browse';

export default function TicketLifecycleMetrics({
  tickets = [],
  performanceMetrics = {},
  lifecycleTrends,
  selectedEngineer,
  timeRange
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

    switch (timeRange) {
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
  }, [tickets]);

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
    if (dateFilteredTickets.length > 0) {
      fetchWorkLogs();
    }
  }, [dateFilteredTickets]);

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
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h == 0 && m == 0) return `${h}h`
    if (h == 0 && m > 0) return `0h ${m}m`
    else if (m > 0) return `${h}h ${m}m`
    else return `${h}h`
  };

  const calculateProgress = (logged, estimate) => {
    if (!estimate || !logged) return 0;
    return Math.min(Math.round((logged / estimate) * 100), 100);
  };
  const calculateProgressBar = (logged, estimate) => {
    if (!estimate || !logged) return 0;
    return Math.round((logged / estimate) * 100) > 100 ? 100 - Math.round((logged / estimate) * 100) : Math.round((logged / estimate) * 100)
  };

  // const CURRENT_STATUSES = ['To Do', 'Start', 'In Progress', 'In Review', 'Blocked', 'Hold'];
  const CURRENT_STATUSES = ['Done', 'Closed'];

  // Update the currentTickets useMemo to filter by selectedEngineer
  const currentTickets = React.useMemo(() => {
    return tickets
      .filter(ticket =>
        !CURRENT_STATUSES.includes(ticket.status) &&
        (!selectedEngineer || ticket.assignee === selectedEngineer) // Add assignee filter
      ).sort((a, b) => new Date(b.updated) - new Date(a.updated));
  }, [tickets, CURRENT_STATUSES, selectedEngineer]); // Add selectedEngineer to dependencies

  // Update the completedTickets useMemo to filter by selectedEngineer
  const completedTickets = React.useMemo(() =>
    dateFilteredTickets
      .filter(t =>
        ['Done', 'Closed'].includes(t.status) &&
        (!selectedEngineer || t.assignee === selectedEngineer) // Add assignee filter
      ).sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))
    , [dateFilteredTickets, selectedEngineer]); // Add selectedEngineer to dependencies

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
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

        return {
          date: new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
          }).replace(',', ''),
          completion: data.cycle_time,
          available: 8, // 8 hours per day for individual engineer
          // variance: completion > 0 ? ((completion - 8) / 8) * 100 : -100,
          variance: data.efficiency,
          activeTask: data.active_tasks,
          completeTask: data.completed_tasks
        };
      })
  }, [lifecycleTrends, selectedEngineer, getDateRange]);

  const renderDailyWorkDetails = () => {
    // if (isLoadingWorkLogs) {
    //   return (
    //     <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
    //       <CircularProgress />
    //     </Box>
    //   );
    // }

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
    switch (selectedMetric) {
      case 'completion':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                domain={['auto', 'auto']}
                label={{
                  value: 'Number of Resources',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 2
                }}
              />
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
                            ? ['Completion Hours'].includes(entry.name) ? formatDuration(entry.value) : `${entry.value}`
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
                    dataKey="activeTask"
                    name="Active Task"
                    stroke="#2ee816"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completeTask"
                    name="Complete Task"
                    stroke="#f38598"
                    dot={false}
                  />
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
  }
  

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
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="completion">Completion Trends</ToggleButton>
                  </Tooltip>
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="projects">Project Distribution</ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>

                {selectedMetric === "completion" && <ToggleButtonGroup
                  value={selectedView}
                  exclusive
                  onChange={(_, value) => value && setSelectedView(value)}
                  size="small"
                  sx={{ ml: 2 }}
                >
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="hours">Hours</ToggleButton>
                  </Tooltip>
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="percentage">Percentage</ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>}

              </Box>

              <Box sx={{ flex: 1, minHeight: 400 }}>
                {selectedMetric === 'completion' ? ( renderChart() ) : (
                  <ProjectDistributionChart
                    currentTickets={currentTickets}
                    completedTickets={completedTickets}
                    selectedEngineer={selectedEngineer}
                  />
                )}
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
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Type</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Summary</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Due Date</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Status</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Logged Time</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Original Estimate</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Progress</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentTickets.map(ticket => (
                      <TableRow key={ticket.key}>
                        <TableCell width={100}>
                          <Link
                            href={`${JIRA_BASE_URL}/${ticket.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textDecoration: 'none' }}
                          >
                            {ticket.key}
                          </Link>
                        </TableCell>
                        <TableCell>{ticket.issue_type}</TableCell>
                        <TableCell width={350}>{ticket.summary}</TableCell>
                        <TableCell width={120}>{ticket.due_date || "N/A"}</TableCell>
                        <TableCell width={130}>
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
                        <TableCell>{formatDuration(ticket.logged)}</TableCell>
                        <TableCell>{formatDuration(ticket.estimate)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={calculateProgress(ticket.logged, ticket.estimate)}
                              sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="caption">
                              {calculateProgressBar(ticket.logged, ticket.estimate)}%
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
                    {currentTickets.length === 0 && (
                      <TableRow sx={{ height: '100%' }}>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <b>No Data Found</b>
                        </TableCell>
                      </TableRow>
                    )}
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
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Type</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Summary</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Due Date</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Complete Date</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Logged Time</TableCell>
                      <TableCell sx={{ bgcolor: 'background.paper' }}>Original Estimate</TableCell>
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
                        <TableCell width={100}>
                          <Link
                            href={`${JIRA_BASE_URL}/${ticket.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textDecoration: 'none' }}
                          >
                            {ticket.key}
                          </Link>
                        </TableCell>
                        <TableCell>{ticket.issue_type}</TableCell>
                        <TableCell width={350}>{ticket.summary}</TableCell>
                        <TableCell>{ticket.due_date || "N/A"}</TableCell>
                        <TableCell>{ticket.completion_date || "N/A"}</TableCell>
                        <TableCell width={100}>{formatDuration(ticket.logged)}</TableCell>
                        <TableCell width={100}>{formatDuration(ticket.estimate)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={calculateProgress(ticket.logged, ticket.estimate)}
                              sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="caption">
                              {calculateProgressBar(ticket.logged, ticket.estimate)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {completedTickets.length === 0 && (
                      <TableRow sx={{ height: '100%' }}>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <b>No Data Found</b>
                        </TableCell>
                      </TableRow>
                    )}
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