
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/common/Logi";
import Register from "./pages/common/Register";
import PasswordReset from "./pages/common/Reset";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/password-reset" element={<PasswordReset />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
