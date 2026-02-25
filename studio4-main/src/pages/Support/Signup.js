// Support portal signup form to create customer support user accounts.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { setDoc, doc } from "firebase/firestore";
import "./Login.css";

function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setErrors({});

        // Validation
        const newErrors = {};
        if (!name.trim()) newErrors.name = "Full name is required";
        if (!email.trim()) newErrors.email = "Email is required";
        if (!phone.trim()) newErrors.phone = "Phone number is required";
        else if (!/^[0-9]{8,15}$/.test(phone))
            newErrors.phone = "Enter a valid phone number (8-15 digits)";
        if (!password.trim()) newErrors.password = "Password is required";
        else if (password.length < 6)
            newErrors.password = "Password must be at least 6 characters";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            // Create user with Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Store user info in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name,
                email: email.trim().toLowerCase(),
                phone,
                role: "Customer Support",
                createdAt: new Date(),
            });

            navigate("/dashboard");
        } catch (error) {
            console.error("Signup Error:", error);
            setErrors({ general: error.message });
        }
    };

    return (
        <div className="login-page">
            <h1 className="title">Create Account</h1>

            <div className="login-container">
                <form onSubmit={handleSignup}>
                    <input
                        type="text"
                        placeholder="Full Name"
                        className="input-box"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    {errors.name && <p className="error-msg">{errors.name}</p>}

                    <input
                        type="email"
                        placeholder="Email Address"
                        className="input-box"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    {errors.email && <p className="error-msg">{errors.email}</p>}

                    <input
                        type="tel"
                        placeholder="Phone Number"
                        className="input-box"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    {errors.phone && <p className="error-msg">{errors.phone}</p>}

                    <input
                        type="password"
                        placeholder="Password"
                        className="input-box"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {errors.password && <p className="error-msg">{errors.password}</p>}

                    {errors.general && <p className="error-msg">{errors.general}</p>}

                    <button type="submit" className="login-btn">
                        Sign Up
                    </button>

                    <p className="signup-link">
                        Already have an account? <a href="/">Login</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Signup;


