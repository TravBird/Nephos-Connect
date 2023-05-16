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
import { faWifi } from '@fortawesome/free-solid-svg-icons';
import isOnline from 'is-online';
import signal0 from '../../assets/signal/0signal.png';
import signal1 from '../../assets/signal/1signal.png';
import signal2 from '../../assets/signal/2signal.png';
import signal3 from '../../assets/signal/3signal.png';
import signal4 from '../../assets/signal/4signal.png';
import signal5 from '../../assets/signal/max_signal.png';
import logo from '../../assets/Nephos-Logo512.png';
import { Home, Loading } from './Login';
import MainMenu from './MainMenu';

function ErrorPopup({ message, setError }: any) {
  return (
    <div id="ErrorPopup">
      <div className="ErrorPopupContent">
        <span
          className="CloseErrorPopup"
          onClick={() => {
            setError('');
          }}
        >
          &times;
        </span>
        {message === undefined ? (
          <h2>An unexpected Error has occured!</h2>
        ) : (
          <>
            <h2>An error has occured!</h2>
            <h3>{message}</h3>
            {message.includes(
              'required information to complete authentication was not provided or was incorrect'
            ) ? (
              <h3>
                Please login again. If the problem persists, please contact a
                Nephos Admin
              </h3>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

async function getWifiNetworks() {
  const result = await window.electron.ipcRendererInternet.getWifiNetworks(
    'get-wifi-networks'
  );
  return result;
}
function ListWifi({ network, setError }) {
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
                type="text"
                id="password"
                name="password"
                placeholder="Password"
              />
            </label>
            <button
              type="button"
              className="ConnectButton"
              onClick={() => {
                console.log('Connecting to WiFi network');
                for (
                  let i = 0;
                  i < document.getElementsByClassName('ConnectButton').length;
                  i += 1
                ) {
                  (
                    document.getElementsByClassName('ConnectButton')[
                      i
                    ] as HTMLInputElement
                  ).disabled = true;
                }
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
                      // enable all buttons
                      for (
                        let i = 0;
                        i <
                        document.getElementsByClassName('ConnectButton').length;
                        i += 1
                      ) {
                        (
                          document.getElementsByClassName('ConnectButton')[
                            i
                          ] as HTMLInputElement
                        ).disabled = false;
                      }
                      return true;
                    }
                    console.log('Error connecting to WiFi network');
                    setError(
                      'Failed to connect to WiFi network, please try again'
                    );
                    // enable all buttons
                    for (
                      let i = 0;
                      i <
                      document.getElementsByClassName('ConnectButton').length;
                      i += 1
                    ) {
                      (
                        document.getElementsByClassName('ConnectButton')[
                          i
                        ] as HTMLInputElement
                      ).disabled = false;
                    }
                    return false;
                  })
                  .catch((error) => {
                    console.log(error);
                    setError(
                      'Failed to connect to WiFi network, please try again: ',
                      error
                    );
                    // enable all buttons
                    for (
                      let i = 0;
                      i <
                      document.getElementsByClassName('ConnectButton').length;
                      i += 1
                    ) {
                      (
                        document.getElementsByClassName('ConnectButton')[
                          i
                        ] as HTMLInputElement
                      ).disabled = false;
                    }
                    return false;
                  });
              }}
            >
              {' '}
              Submit{' '}
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

function WifiSelection({ setError }) {
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
            <ListWifi network={network} setError={setError} />
          ))}{' '}
        </ul>
      </div>
    );
  }
  return <div className="Loader" />;
}

function WifiSettings({ setOpenWifiSettings, setInternet, setError }) {
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
        <WifiSelection setError={setError} />
      </div>
    </div>
  );
}

function LoginRegisterChoice({ error, setError }: any) {
  const [activeState, setActiveState] = useState('Home');
  const [openWifiSettings, setOpenWifiSettings] = useState(false);
  const [loadingMessageState, setLoadingMessageState] = useState('');
  const [internet, setInternet] = useState(false);

  function closeWifiSettings() {
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
      <img src={logo} alt="Nephos Logo" className="Logo" />
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
      {error !== '' ? <ErrorPopup message={error} setError={setError} /> : null}
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
          onLoadingError={() => {
            setActiveState('Home');
          }}
          internet={internet}
          setInternet={setInternet}
          setLoadingMessageState={setLoadingMessageState}
          error={error}
          setError={setError}
        />
        {openWifiSettings ? (
          <WifiSettings
            setOpenWifiSettings={setOpenWifiSettings}
            setInternet={setInternet}
            setError={setError}
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
  const [error, setError] = useState('');

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <LoginRegisterChoice
              ErrorPopup={ErrorPopup}
              error={error}
              setError={setError}
            />
          }
        />
        <Route
          path="/home"
          element={
            <MainMenu
              ErrorPopup={ErrorPopup}
              error={error}
              setError={setError}
            />
          }
        />
      </Routes>
    </Router>
  );
}
