/* eslint-disable react/jsx-filename-extension */
import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignal, faSignal5, faWifi } from '@fortawesome/free-solid-svg-icons';
import { sign } from 'crypto';
import signal0 from '../../assets/signal/0signal.png';
import signal1 from '../../assets/signal/1signal.png';
import signal2 from '../../assets/signal/2signal.png';
import signal3 from '../../assets/signal/3signal.png';
import signal4 from '../../assets/signal/4signal.png';
import signal5 from '../../assets/signal/max_signal.png';
import { Home, Loading } from './Login';
import MainMenu from './MainMenu';

async function getWifiNetworks() {
  const result = await window.electron.ipcRendererInternet.getWifiNetworks(
    'get-wifi-networks'
  );
  return result;
}
function ListWifi({ network, selectedNetwork, setSelectedNetwork }) {
  const [open, setOpen] = useState(false);

  const signalStrengthIcon = (signalStrength) => {
    if (signalStrength > 80) {
      return (
        <img src={signal5} alt="Great Signal Strength" className="SignalIcon" />
      );
    }
    if (signalStrength > 60) {
      return (
        <img src={signal4} alt="Good Signal Strength" className="SignalIcon" />
      );
    }
    if (signalStrength > 40) {
      return (
        <img
          src={signal3}
          alt="Decent Signal Strength"
          className="SignalIcon"
        />
      );
    }
    if (signalStrength > 20) {
      return (
        <img src={signal2} alt="Poor Signal Strength" className="SignalIcon" />
      );
    }
    if (signalStrength > 10) {
      return (
        <img
          src={signal1}
          alt="Very poor Signal Strength"
          className="SignalIcon"
        />
      );
    }
    return (
      <img
        src={signal0}
        alt="Extremely poor Signal Strength"
        className="SignalIcon"
      />
    );
  };
  return (
    <li className="NetworkInfo" key={network.ssid}>
      <div className="InitialInfo">
        <span id={network.ssid}>
          {signalStrengthIcon(network.quality)}&#160;&#160;&#160;&#160;
          {network.ssid}
        </span>
        <span>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? 'Cancel' : 'Connect'}
          </button>
        </span>
      </div>
      {open ? (
        <div className="Connect">
          <form>
            <label htmlFor="password">
              Password:
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Password"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                console.log('Connecting to WiFi network');
                window.electron.ipcRendererInternet
                  .addWifiNetwork('add-wifi-network', [
                    network.ssid,
                    document.getElementById('password').value,
                  ])
                  .then((result) => {
                    if (result.success === 'true') {
                      console.log('Successfully connected to WiFi network');
                      document.getElementById('error').innerHTML =
                        'Connected to WiFi network';
                    } else {
                      console.log('Error connecting to WiFi network');
                      document.getElementById('error').innerHTML =
                        'Failed to connect to WiFi network, please try again';
                    }
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              }}
            >
              {' '}
              Submit{' '}
            </button>
          </form>
          <div id="error" />
        </div>
      ) : null}
    </li>
  );
}

function WifiSelection(selectedNetwork, setSelectedNetwork) {
  const [networks, setNetworks] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      setNetworks(await getWifiNetworks());
      const result = await getWifiNetworks();
      let wifi = result.networks;
      console.log(wifi);
      if (result.success) {
        wifi = wifi.reverse();
      } else {
        console.log('Error getting WiFi networks');
      }
    }
    fetchData();
  }, []);
  console.log(networks);
  if (networks.length > 0) {
    return (
      <div id="Create Wifi Select">
        <ul>
          {networks.map((network) => (
            <ListWifi
              network={network}
              selectedNetwork={selectedNetwork}
              setSelectedNetwork={setSelectedNetwork}
            />
          ))}{' '}
        </ul>
      </div>
    );
  }
  return <div className="Loader" />;
}

function WifiSettings({ setOpenWifiSettings, wifiNetworks, internet, setInternet }) {
  const [selectedNetwork, setSelectedNetwork] = useState('');
  setInternet(navigator.onLine);
  return (
    <div id="WifiSettings" className="modal">
      <div className="WifiSettingsContent">
        <span
          className="CloseWifiSettings"
          onClick={() => setOpenWifiSettings(false)}
        >
          &times;
        </span>
        <h2>Select a Wireless Network</h2>
        <WifiSelection
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={setSelectedNetwork}
        />
      </div>
    </div>
  );
}

function LoginRegisterChoice() {
  const [activeState, setActiveState] = useState('Home');
  const authenticated = localStorage.getItem('authenticated');
  const navigate = useNavigate();
  const [openWifiSettings, setOpenWifiSettings] = useState(false);
  const [loadingMessageState, setLoadingMessageState] = useState('');
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [internet, setInternet] = useState(navigator.onLine);

  function handlePowerOff() {
    window.electron.ipcRendererShutdown.shutdown('shutdown');
  }

  function closeWifiSettings() {
    setInternet(navigator.onLine);
    if (navigator.onLine) {
      setInternet(true);
    }
    setOpenWifiSettings(false);
  }

  window.addEventListener('click', (event) => {
    const modal = document.getElementById('WifiSettings');
    if (event.target === modal) {
      closeWifiSettings();
    }
  });

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
            setOpenWifiSettings(true);
          }}
        >
          <FontAwesomeIcon icon={faWifi} /> Wireless Settings
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
          internet={internet}
          setInternet={setInternet}
          setLoadingMessageState={setLoadingMessageState}
        />
        {openWifiSettings ? (
          <WifiSettings
            setOpenWifiSettings={setOpenWifiSettings}
            wifiNetworks={wifiNetworks}
            internet={internet}
            setInternet={setInternet}
          />
        ) : null}
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
