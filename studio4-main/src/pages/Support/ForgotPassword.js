// Support password reset flow using OTP email verification and Firebase auth updates.
import React, { useState } from "react";
import { getAuth, updatePassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { app } from "../../firebase";
import emailjs from "@emailjs/browser";
import "./ForgotPassword.css";

const ForgotPassword = () => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
    const [step, setStep] = useState(1);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Step 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otpCode);

        try {
            // Save OTP to Firestore
            await setDoc(doc(db, "otpRequests", email), {
                otp: otpCode,
                createdAt: new Date(),
            });

            // Send email via EmailJS
            await emailjs.send(
                "YOUR_SERVICE_ID",
                "YOUR_TEMPLATE_ID",
                {
                    to_email: email,
                    otp: otpCode,
                },
                "YOUR_PUBLIC_KEY"
            );

            setMessage(" OTP sent to your email!");
            setStep(2);
        } catch (err) {
            console.error(err);
            setError("Failed to send OTP. Please try again.");
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        try {
            const docRef = doc(db, "otpRequests", email);
            const otpDoc = await getDoc(docRef);

            if (!otpDoc.exists()) {
                setError("OTP expired or not found.");
                return;
            }

            const savedOtp = otpDoc.data().otp;
            if (savedOtp === otp) {
                setMessage(" OTP verified successfully!");
                setStep(3);
            } else {
                setError("Invalid OTP, please try again.");
            }
        } catch (err) {
            setError("Verification failed. Try again.");
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        try {
            // Reauthenticate before changing password
            await signInWithEmailAndPassword(auth, email, newPassword);
            await updatePassword(auth.currentUser, newPassword);

            // Remove OTP record
            await deleteDoc(doc(db, "otpRequests", email));

            setMessage(" Password changed successfully!");
            setStep(1);
        } catch (err) {
            console.error(err);
            setError("Failed to update password.");
        }
    };

    return (
        <div className="login-page">
            <h1 className="title">Reset Password with OTP</h1>
            <div className="login-container">
                {step === 1 && (
                    <form onSubmit={handleSendOtp}>
                        <input
                            type="email"
                            placeholder="Enter your registered email"
                            className="input-box"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" className="login-btn">
                            Send OTP
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp}>
                        <input
                            type="text"
                            placeholder="Enter OTP"
                            className="input-box"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                        <button type="submit" className="login-btn">
                            Verify OTP
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            className="input-box"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button type="submit" className="login-btn">
                            Reset Password
                        </button>
                    </form>
                )}

                {message && <p className="success-msg">{message}</p>}
                {error && <p className="error-msg">{error}</p>}
            </div>
        </div>
    );
};

export default ForgotPassword;
