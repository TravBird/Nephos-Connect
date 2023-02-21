import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { useEffect, useState, Component } from 'react';
import { Transition } from 'react-transition-group';
import { act } from 'react-test-renderer';
import icon from '../../assets/icon.svg';
import './App.css';
import startVM from './StartVM';

export default function MainMenu() {
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('authenticated');
    setauthenticated('false');
    navigate('/');
  };
  const [shapes, setShapes] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [selected, setSelected] = useState('');
  const [awaiting, setAwaiting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.electron.ipcRendererOCI
      .ociConnectTest('oci-connect-test', 'test')
      .then((result) => setShapes(result.items))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    window.electron.ipcRendererOCI
      .listInstanceConfigs('instance-configs', 'test')
      .then((result) => setConfigs(result.items))
      .catch((err) => console.log(err));
  }, []);

  function startVMRequest(request) {
    setAwaiting(true);
    startVM(request).then((result) => {
      setAwaiting(false);
      if (result === 'success') {
        navigate('/loading_vm');
      } else {
        setError(true);
      }
    });
  }

  const ConfigInfo = (config) => {
    const [open, setOpen] = useState(false);

    if (open === false) {
      return (
        <li className="ConfigInfo">
          <div className="InitialInfo">
            <div id={config.config.displayName}>
              <input
                type="radio"
                checked={selected === config.config.displayName}
                onChange={() => setSelected(config.config.displayName)}
              />
              {config.config.displayName}
              <button
                onClick={() => {
                  setOpen(true);
                }}
              >
                + More Info
              </button>
            </div>
          </div>
        </li>
      );
    }
    return (
      <li className="ConfigInfo">
        <div className="InitialInfo">
          <div id={config.config.displayName}>
            <input
              type="radio"
              checked={selected === config.config.displayName}
              onChange={() => setSelected(config.config.displayName)}
            />
            {config.config.displayName}
            <button
              onClick={() => {
                setOpen(false);
              }}
            >
              - Less Info
            </button>
          </div>
          <div className="AdditionalInfo">
            <p>Compartment: {config.config.compartmentId}</p>
          </div>
        </div>
      </li>
    );
  };

  function OSSelection() {
    return (
      <div id="OS Selection">
        <h1>Select your operating system below</h1>
        <ul>
          {configs.map((config) => (
            <ConfigInfo config={config} selected={selected} />
          ))}
        </ul>
      </div>
    );
  }

  function StartVMButton() {
    // implement a for loop through configs
    let selectedConfig = '';
    for (let i = 0; i < configs.length; i++) {
      if (configs[i].displayName === selected) {
        selectedConfig = configs[i];
      }
    }
    return (
      <button
        type="button"
        onClick={() => startVMRequest(selectedConfig)}
        id={selected}
        disabled={awaiting}
      >
        Launch {selected}?
      </button>
    );
  }
  function LogoutButton() {
    return (
      <button type="button" id="LogoutButton" onClick={() => logout()}>
        Logout
      </button>
    );
  }

  if (selected === '') {
    return (
      <div>
        <OSSelection />
        <LogoutButton />
      </div>
    );
  }
  return (
    <div>
      <OSSelection />
      <StartVMButton />
      <LogoutButton />
    </div>
  );
}
