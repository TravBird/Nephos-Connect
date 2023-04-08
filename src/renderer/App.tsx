import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Transition } from 'react-transition-group';
import { act } from 'react-test-renderer';
import icon from '../../assets/icon.svg';
import './App.css';

import { Home, Login, Register } from './Login';
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
          onLoginChoice={() => setActiveState('Login')}
          onRegisterChoice={() => setActiveState('Register')}
        />
        <Login
          isActive={activeState === 'Login'}
          onBack={() => setActiveState('Home')}
        />
        <Register
          isActive={activeState === 'Register'}
          onBack={() => setActiveState('Home')}
        />
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
