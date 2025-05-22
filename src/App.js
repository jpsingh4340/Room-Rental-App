import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/addroom" element={<AddRoom /> } />
        <Route path="/guest-rooms" element={<GuestRoomList />} />


        <Route
          path="/roomlisting"
          element={user ? <RoomListing /> : <Navigate to="/login" />}

      </Routes>
    </Router>
  );
}

export default App;
