// src/pages/Profile.js
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="profile-container">
      <div className="profile-card">
        <img    
          src={user.photoURL || '/avatars/profile.png'}
          alt="User Avatar"
          className="profile-avatar"
        />
        <h2 className="profile-name">{user.fullName || user.email}</h2>
        <p className="profile-role">{user.role?.toUpperCase()}</p>
        <div className="profile-info">
          <div>
            <label>Email:</label>
            <span>{user.email}</span>
          </div>
          <div>
            <label>Joined:</label>
            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          {/* add any other fields you store, e.g. phone, address */}
        </div>
        <button className="edit-btn">Edit Profile</button>
      </div>
    </div>
  );
};

export default Profile;
