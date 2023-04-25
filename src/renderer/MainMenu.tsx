/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import startVM from './StartVM';

function closeCreateSystemForm() {
  document.getElementById('CreateSystemForm').style.display = 'none';
}

window.addEventListener('click', (event) => {
  const modal = document.getElementById('CreateSystemForm');

  if (event.target === modal) {
    closeCreateSystemForm();
  }
});

function OpenSystemCreateButton() {
  return (
    <button
      type="button"
      id="OpenSystemCreateButton"
      onClick={() => {
        document.getElementById('CreateSystemForm').style.display = 'block';
      }}
    >
      Create New System
    </button>
  );
}

function CreateSystemForm({ configs, selected, setSelected }) {
  return (
    <div id="CreateSystemForm">
      <div className="CreateSystemFormContent">
        <span
          className="CloseCreateSystemForm"
          onClick={() => {
            closeCreateSystemForm();
          }}
        >
          &times;
        </span>
        <h2>Create a new System</h2>
        <SysConfigSelection />
      </div>
    </div>
  );
}

async function getUserSystems() {
  const result = await window.electron.ipcRendererOCI.listUserSystems(
    'list-user-systems'
  );
  return result;
}

async function getSystemConfigs() {
  const result = await window.electron.ipcRendererOCI.listSystemConfigurations(
    'list-system-configs'
  );
  return result;
}

function ListSystem(system, selected, setSelected) {
  const [open, setOpen] = useState(false);

  const { displayName, compartmentId, id, shape, shapeConfig } = system;

  if (open === false) {
    return (
      <li className="ConfigInfo" key={displayName}>
        <div className="InitialInfo">
          <div id={displayName}>
            <input
              type="radio"
              checked={selected === displayName}
              onChange={() => setSelected(displayName)}
            />
            {displayName}
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
        <div id={displayName}>
          <input
            type="radio"
            checked={selected === displayName}
            onChange={() => setSelected(displayName)}
          />
          {displayName}
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
          <p>Compartment: {compartmentId}</p>
        </div>
      </div>
    </li>
  );
}

function SysSelection({ systems, selected, setSelected }) {
  return (
    <div id="OS Selection">
      <h1>Select your System below</h1>
      <ul>
        {systems.map((system) => (
          <ListSystem
            config={system}
            selected={selected}
            key={system.displayName}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

function ListConfig(config) {
  const [open, setOpen] = useState(false);

  const { displayName, compartmentId, id, shape, shapeConfig } = config.config;

  if (open === false) {
    return (
      <li className="ConfigInfo" key={displayName}>
        <div className="InitialInfo">
          <div id={displayName}>
            <input
              type="radio"
              // checked={selected === items.displayName}
              // onChange={() => setSelected(items.displayName)}
            />
            {displayName}
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
        <div id={displayName}>
          <input
            type="radio"
            // checked={selected === items.displayName}
            // onChange={() => setSelected(items.displayName)}
          />
          {displayName}
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
          <p>Compartment: {compartmentId}</p>
        </div>
      </div>
    </li>
  );
}

function SysConfigSelection() {
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      setConfigs(await getSystemConfigs());
    }
    fetchData();
  }, []);
  console.log(configs);
  console.log(configs[0]);
  return (
    <div id="OS Selection">
      <h1>Select your System Configuration below</h1>
      <ul>
        {configs.map((config) => (
          <ListConfig
            config={config}
            // selected={config.selected}
            key={config.displayName}
            // setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

const createSystemRequest = (
  request: string,
  setError: any,
  setAwaiting: any
) => {
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

function createSystem({ configs, selected, awaiting, setAwaiting, setError }) {
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
      onClick={() => createSystemRequest(selectedConfig, setError, setAwaiting)}
      id={selected}
      disabled={awaiting}
    >
      Launch {selected}?
    </button>
  );
}

function LogoutButton() {
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
              localStorage.removeItem('authenticated');
              return navigate('/');
            }
            console.log('Logout failed');
            return null;
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
  const [systems, setSystems] = useState([]);
  const [selected, setSelected] = useState('');
  const [awaiting, setAwaiting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      const response = await getUserSystems();
      setSystems(response);
    }
    fetchData();
  }, []);

  if (systems.length > 0) {
    if (selected === '') {
      return (
        <div>
          <SysSelection
            systems={systems}
            selected={selected}
            setSelected={setSelected}
          />
          <CreateSystemForm
            configs={systems}
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
        <SysSelection
          configs={systems}
          selected={selected}
          setSelected={setSelected}
        />
        <StartVMButton
          configs={systems}
          selected={selected}
          awaiting={awaiting}
          setAwaiting={setAwaiting}
          setError={setError}
        />
        <CreateSystemForm
          configs={systems}
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
      <h2>You have no systems yet, create a new one here!</h2>
      <CreateSystemForm
        configs={systems}
        selected={selected}
        setSelected={setSelected}
      />
      <OpenSystemCreateButton />
    </div>
  );
}
