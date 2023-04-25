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

  const [loadingMessageState, setLoadingMessageState] = useState('');

  /*
  const Authenticated = () => {
    if (authenticated === 'true') {
      return navigate('/home');
    }
  };

  useEffect(() => {
    Authenticated();
  });
  */

  function handlePowerOff() {
    window.electron.ipcRendererShutdown.shutdown('shutdown');
  }

  return (
    <>
      <div id="TopMenu">
        <button
          type="button"
          id="PowerOffButton"
          onClick={() => {
            handlePowerOff();
          }}
        >
          Power Off
        </button>

        <button
          type="button"
          id="WirelessSettingsButton"
          onClick={() => {
            // open wifi settings
            window.electron.ipcRendererInternet.getWifiNetworks('get-wifi-networks');
          }}
        >
          Wireless Settings
        </button>
      </div>

      <div className="LoginRegisterContainer">
        <h1>Welcome to Nephos!</h1>
        <Home
          isActive={activeState === 'Home'}
          onLoading={() => setActiveState('Loading')}
          onLoadingFirstTime={() => {
            setLoadingMessageState('Setting up your account, please wait...');
          }}
          onLoadingLocalSetup={() => {
            setLoadingMessageState(
              'Setting up local configuration, please wait...'
            );
          }}
          onLoadingError={(error: string) => {
            setLoadingMessageState(
              `Unfortunately there was an ${error} \n Please try again...`
            );
          }}
        />
        <Loading
          isActive={activeState === 'Loading'}
          message={loadingMessageState}
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
