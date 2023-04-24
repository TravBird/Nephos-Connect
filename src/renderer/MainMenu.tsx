/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import { config } from 'process';
import startVM from './StartVM';

function ListSystems() {
  const [open, setOpen] = useState(false);
  const [systems, setSystems] = useState([]);

  if (open === false) {
    return (
      <div id="ListSystems">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
        >
          + List Systems
        </button>
      </div>
    );
  }
}

function ConfigInfo({ config, selected, setSelected }) {
  const [open, setOpen] = useState(false);

  const items = config;

  if (open === false) {
    return (
      <li className="ConfigInfo" key={items.displayName}>
        <div className="InitialInfo">
          <div id={items.displayName}>
            <input
              type="radio"
              checked={selected === items.displayName}
              onChange={() => setSelected(items.displayName)}
            />
            {items.displayName}
            <button
              type="button"
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
        <div id={items.displayName}>
          <input
            type="radio"
            checked={selected === items.displayName}
            onChange={() => setSelected(items.displayName)}
          />
          {items.displayName}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
          >
            - Less Info
          </button>
        </div>
        <div className="AdditionalInfo">
          <p>Compartment: {items.compartmentId}</p>
        </div>
      </div>
    </li>
  );
}

function OSSelection(props) {
  const { configs } = props;
  const { selected } = props;
  const { setSelected } = props;

  return (
    <div id="OS Selection">
      <h1>Select your operating system below</h1>
      <ul>
        {configs.map((configuration) => (
          <ConfigInfo
            config={configuration}
            selected={selected}
            key={configuration.displayName}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

const StartVMRequest = (request: string, setError: any, setAwaiting: any) => {
  const navigate = useNavigate();
  setAwaiting(true);
  startVM(request)
    .then((result) => {
      setAwaiting(false);
      if (result === 'success') {
        navigate('/loading_vm');
        return true;
      }
      setError(true);
      throw new Error('Error starting VM');
    })
    .catch((error) => {
      setAwaiting(false);
      setError(true);
    });
};

function StartVMButton({ configs, selected, awaiting, setAwaiting, setError }) {
  const items = configs;

  // implement a for loop through configs
  let selectedConfig = '';
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].displayName === selected) {
      selectedConfig = items[i];
    }
  }
  return (
    <button
      type="button"
      onClick={() => StartVMRequest(selectedConfig, setError, setAwaiting)}
      id={selected}
      disabled={awaiting}
    >
      Launch {selected}?
    </button>
  );
}
function LogoutButton(setAuthenticated: any) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      id="LogoutButton"
      onClick={() => {
        // localStorage.removeItem('authenticated');
        // setAuthenticated('false');
        window.electron.ipcRendererOCIauth
          .logout('logout')
          .then((result) => {
            console.log(result);
            if (result.success === 'true') {
              // localStorage.removeItem('authenticated');
              navigate('/');
            }
          })
          .catch((err) => console.log(err));
      }}
    >
      Logout
    </button>
  );
}

export default function MainMenu() {
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const [shapes, setShapes] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [selected, setSelected] = useState('');
  const [awaiting, setAwaiting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.electron.ipcRendererOCI
      .listInstanceConfigs('instance-configs', 'test')
      .then((result) => setConfigs(result))
      .catch((err) => console.log(err));
  }, []);

  if (selected === '') {
    return (
      <div>
        <OSSelection
          configs={configs}
          selected={selected}
          setSelected={setSelected}
        />
        <LogoutButton
          logout={LogoutButton}
          setAuthenticated={setAuthenticated}
        />
      </div>
    );
  }
  return (
    <div>
      <OSSelection
        configs={configs}
        selected={selected}
        setSelected={setSelected}
      />
      <StartVMButton
        configs={configs}
        selected={selected}
        awaiting={awaiting}
        setAwaiting={setAwaiting}
        setError={setError}
      />
      <LogoutButton logout={LogoutButton} setAuthenticated={setAuthenticated} />
    </div>
  );
}
