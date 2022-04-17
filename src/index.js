import React from "react";
import { createRoot } from 'react-dom/client';
import { AppView } from "./app.jsx";

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<AppView />);