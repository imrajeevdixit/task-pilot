import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Container, Grid, Paper, Typography, FormControl,
  InputLabel, Select, MenuItem, OutlinedInput, Chip,
  CircularProgress, Alert, Button, ListItemText, List, ListItem, ListItemButton,
  Checkbox, TextField, AppBar, Toolbar, IconButton, Menu, Avatar,} from '@mui/material';
import { getDashboardData, getPerformanceTrends, searchAssignees } from '../services/api';
import MetricsCard from './MetricsCard';
import ExpandableBarGraph from './ExpandableBarGraph';
import TicketLifecycleMetrics from './TicketLifecycleMetrics';
import { AccountCircle } from '@mui/icons-material';

const timeRanges = [
  { value: '7d', label: 'Last Week' },
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: 'all', label: 'All Time' }
];

const ALL_PROJECTS = ['THC', 'TEC', 'TPC', 'TWCP', 'TPO', 'TEST'];

export default function Dashboard({ handleLoginIn }) {
  const [timeRange, setTimeRange] = useState('1m');
  const [selectedProjects, setSelectedProjects] = useState(ALL_PROJECTS);
  const [tempSelectedProjects, setTempSelectedProjects] = useState(ALL_PROJECTS);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [assignees, setAssignees] = useState([])
  const [assigneesData, setAssigneesData] = useState([])
  const [performanceTrends, setPerformanceTrends] = useState({})
  const [data, setData] = useState({})
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoading, setIsLoading] = useState(true)
  const [isLoader, setIsLoader] = useState(false)
  const [loader, setLoader] = useState(false)
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  const handleProjectChange = (event) => {
    const value = event.target.value;
    if (value.includes('ALL')) {
      if (tempSelectedProjects.length === ALL_PROJECTS.length) {
        setTempSelectedProjects([]);
      } else {
        setTempSelectedProjects(ALL_PROJECTS);
      }
    } else {
      setTempSelectedProjects(value);
    }
  };

  const handleApplyProjects = () => {
    setSelectedProjects(tempSelectedProjects);
    setIsProjectsOpen(false);
    getDashboardData(timeRange, tempSelectedProjects.join(','), selectedAssignees.join(','), selectedEngineer, setLoader, setData)
  };

  const handleProjectsClose = () => {
    setTempSelectedProjects(selectedProjects); // Reset to previous selection
    setIsProjectsOpen(false);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedIn")
    handleLoginIn(false)
  }

  useEffect(() => {
    if (selectedEngineer || selectedAssignees.length > 0 || (selectedEngineer && timeRange !== "1m"))
      getDashboardData(timeRange, selectedProjects.join(','), selectedAssignees.join(','), selectedEngineer, setLoader, setData)
  }, [timeRange, selectedAssignees])

  useEffect(() => {
    searchAssignees('', selectedProjects.join(','), setIsLoading, (data) => {
      setAssignees(data)
      setAssigneesData(data)
    })
  }, [])

  useEffect(() => {
    getPerformanceTrends(timeRange, selectedProjects.join(','), setIsLoader, setPerformanceTrends)
  }, [timeRange, selectedProjects])

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ paddingBottom: 4 }}>
      <Box sx={{ mb: 4 }}>
        {/* <Typography variant="h4" component="h1" gutterBottom>
          Engineering Productivity Dashboard
        </Typography> */}
        <AppBar position="static" sx={{ backgroundColor: "#1976d2", marginBottom: 3 }}>
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            {/* Left Side - Dashboard Title */}
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Engineering Productivity Dashboard
            </Typography>

            {/* Right Side - Profile Icon */}
            <Box>
              <IconButton onClick={handleMenuOpen} color="inherit">
                <Avatar sx={{ bgcolor: "white", color: "#1976d2" }}>
                  <AccountCircle />
                </Avatar>
              </IconButton>

              {/* Dropdown Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }}>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              {timeRanges.map((range) => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 300 }}>
            <InputLabel>Projects</InputLabel>
            <Select
              multiple
              open={isProjectsOpen}
              onOpen={() => setIsProjectsOpen(true)}
              onClose={handleProjectsClose}
              value={tempSelectedProjects}
              onChange={handleProjectChange}
              input={<OutlinedInput label="Projects" />}
              renderValue={(selected) => {
                if (selected.length === ALL_PROJECTS.length) {
                  return <Chip label="All Projects" />;
                }
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                );
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300
                  }
                }
              }}
            >
              <MenuItem value="ALL">
                <Checkbox
                  checked={tempSelectedProjects.length === ALL_PROJECTS.length}
                  indeterminate={tempSelectedProjects.length > 0 && tempSelectedProjects.length < ALL_PROJECTS.length}
                />
                <ListItemText primary="All Projects" />
              </MenuItem>
              <MenuItem disabled sx={{ opacity: 0.5 }}>
                Individual Projects
              </MenuItem>
              {ALL_PROJECTS.map((project) => (
                <MenuItem key={project} value={project}>
                  <Checkbox checked={tempSelectedProjects.includes(project)} />
                  <ListItemText primary={project} />
                </MenuItem>
              ))}
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectsClose();
                  }}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyProjects();
                  }}
                  variant="contained"
                >
                  Apply
                </Button>
              </Box>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Team Performance Overview */}
        <Grid item xs={12}>
          <ExpandableBarGraph ALL_PROJECTS={selectedProjects} performanceTrends={performanceTrends} isLoader={isLoader} />
        </Grid>

        {/* Split View Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 0, display: 'flex', height: 800 }}>
            {/* Left Section - Engineer List */}
            <Box sx={{
              width: 300,
              borderRight: 1,
              borderColor: 'divider',
              overflow: 'auto'
            }}>
              <Box sx={{
                bgcolor: 'grey.100',
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                py: 1.5
              }}>
                <Typography variant="h6">Team Members</Typography>
              </Box>
              <TextField
                label="Search Team Member"
                onChange={(e) => {
                  if (e.target.value)
                    setAssigneesData(assignees.filter((item) => item.displayName.toLowerCase().includes(e.target.value.toLowerCase())))
                  else
                    setAssigneesData(assignees)
                }}
                sx={{
                  width: '280px'
                }}
              />

              <List sx={{ p: 0 }}>
                {assigneesData?.map((el, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton
                      selected={selectedEngineer === el.displayName}
                      onClick={() => {
                        if (selectedEngineer !== el.displayName) {
                          setSelectedEngineer(el.displayName)
                          setSelectedAssignees([assignees.find((item) => item.displayName === el.displayName).accountId])
                        }
                      }}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          '&:hover': {
                            bgcolor: 'primary.light',
                          },
                        },
                      }}
                    >
                      <ListItemText
                        primary={el.displayName}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Right Section - Metrics and Insights */}
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {selectedEngineer ? (
                loader ? (<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                  <CircularProgress />
                </Box>) : (<>
                  <Typography variant="h5" sx={{ p: 2, pb: 1 }}>
                    {selectedEngineer}'s Performance Insights
                  </Typography>
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2, pt: 1 }}>
                    <MetricsCard
                      metrics={{
                        ...data?.performance_metrics,
                        time_variance: data?.engineers_data?.[selectedEngineer]?.time_variance,
                        idle_time: data?.engineers_data?.[selectedEngineer]?.idle_time,
                        total_logged: data?.engineers_data?.[selectedEngineer]?.total_logged,
                        total_estimate: data?.engineers_data?.[selectedEngineer]?.total_estimate,
                        total_working_hour: data?.engineers_data?.[selectedEngineer]?.total_working_hour,
                        day: timeRange
                      }}
                      expanded={true}
                    />
                    <Box sx={{ mt: 2 }}>
                      <TicketLifecycleMetrics
                        tickets={data?.tickets || []}
                        performanceMetrics={data?.performance_metrics || {}}
                        lifecycleTrends={data?.lifecycle_trends}
                        selectedEngineer={selectedEngineer}
                        timeRange={timeRange}
                      />
                    </Box>
                  </Box>
                </>)
              ) : (
                <Box sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary'
                }}>
                  <Typography variant="h6">
                    Select an engineer to view their insights
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 