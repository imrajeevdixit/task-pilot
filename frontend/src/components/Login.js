import React, { useState } from "react";
import {
    Container,
    TextField,
    Button,
    Typography,
    IconButton,
    InputAdornment,
    Box,
    Snackbar,
    Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const Login = ({ handleLoginIn }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Password validation function
    const isValidPassword = (password) => {
        return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
    };

    const handleLogin = (e) => {
        e.preventDefault()
        if (!email.trim()) {
            setErrorMessage("Username/Email is required");
            setOpenSnackbar(true);
            return;
        }
        if (!password.trim()) {
            setErrorMessage("Password is required");
            setOpenSnackbar(true);
            return;
        }
        if (!isValidPassword(password)) {
            setErrorMessage("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
            setOpenSnackbar(true);
            return;
        }

        // Check hardcoded credentials
        if ((email === "admin" || email === "admin@truworthwellness.com") && password === "Truw0rth@123") {
            localStorage.setItem("loggedIn", true);
            handleLoginIn(true);
        } else if (!(email === "admin" || email === "admin@truworthwellness.com")) {
            setErrorMessage("Invalid Username/Email");
            setOpenSnackbar(true);
        } else {
            setErrorMessage("Invalid Credentials");
            setOpenSnackbar(true);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    mt: 10,
                    p: 4,
                    boxShadow: 3,
                    borderRadius: 2,
                    textAlign: "center",
                }}
            >
                <Typography variant="h4" gutterBottom>
                    Login
                </Typography>

                {/* Email Field */}
                <form onSubmit={handleLogin}>
                    <TextField
                        fullWidth
                        // type="email"
                        label="Email"
                        variant="outlined"
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="off"
                    // error={!isValidEmail(email) && email !== ""}
                    // helperText={!isValidEmail(email) && email !== "" ? "Enter a valid email" : ""}
                    />

                    {/* Password Field */}
                    <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        variant="outlined"
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        error={!isValidPassword(password) && password !== ""}
                        helperText={!isValidPassword(password) && password !== "" ? "At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character" : ""}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Login Button */}
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                    >
                        Login
                    </Button>
                </form>
            </Box>

            {/* Snackbar for Error Messages */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000} // Closes after 3 seconds
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }} // Position
            >
                <Alert onClose={() => setOpenSnackbar(false)} severity="error" sx={{ width: "100%" }}>
                    {errorMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Login;
