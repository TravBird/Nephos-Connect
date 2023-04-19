/* eslint-disable react/jsx-filename-extension */
import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';

import { Home, Register, Loading } from './Login';
import MainMenu from './MainMenu';

function LoginRegisterChoice() {
  const [activeState, setActiveState] = useState('Home');
  const authenticated = localStorage.getItem('authenticated');
  const navigate = useNavigate();

  const Authenticated = () => {
    if (authenticated === 'true') {
      return navigate('/home');
    }
  };
  useEffect(() => {
    Authenticated();
  });

  function handlePowerOff() {
    window.electron.ipcRendererShutdown.shutdown('shutdown');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          handlePowerOff();
        }}
      >
        Power Off
      </button>

      <div className="LoginRegisterContainer">
        <h1>Welcome to Nephos!</h1>
        <Home
          isActive={activeState === 'Home'}
          // onLoginChoice={() => setActiveState('Login')}
          onRegisterChoice={() => setActiveState('Register')}
          onLoadingChoice={() => setActiveState('Loading')}
        />
        <Register
          isActive={activeState === 'Register'}
          onBack={() => setActiveState('Home')}
        />
        <Loading isActive={activeState === 'Loading'} />
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRegisterChoice />} />
        <Route path="/home" element={<MainMenu />} />
      </Routes>
    </Router>
  );
}
