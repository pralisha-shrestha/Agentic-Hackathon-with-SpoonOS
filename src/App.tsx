import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingView from './components/LandingView';
import PrototypeView from './components/PrototypeView';
import DevelopmentView from './components/DevelopmentView';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/prototype" element={<PrototypeView />} />
        <Route path="/development" element={<DevelopmentView />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
