/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { SetStateAction, useEffect, useState } from 'react';
import './App.css';

function LoadingScreen({ loadingMessage }: any) {
  return (
    <div id="LoadingScreen">
      <div className="LoadingScreenContent">
        <h1>{loadingMessage}</h1>
        <h2>Please wait</h2>
        <div className="Loader" />
      </div>
    </div>
  );
}

function OpenSystemCreateButton({ setOpenNewSystemSelection }: any) {
  return (
    <button
      type="button"
      id="OpenSystemCreateButton"
      onClick={() => {
        setOpenNewSystemSelection(true);
      }}
    >
      Create New System
    </button>
  );
}

function ListNewSystem({
  config,
  selectedNewSystem,
  setSelectedNewSystem,
}: any) {
  const [open, setOpen] = useState(false);
  console.log(config);
  console.log(selectedNewSystem);
  const { id, displayName } = config;
  return (
    <li className="ConfigInfo" key={config.id}>
      <div className="InitialInfo">
        <span id={config.id}>
          <input
            type="radio"
            checked={selectedNewSystem.id === config.id}
            onChange={() => setSelectedNewSystem({ id, displayName })}
          />
          {displayName}
        </span>
        <span>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? '- Less Info' : '+ Advanced Info'}
          </button>
        </span>
      </div>
      {open ? (
        <div className="AdditionalInfo">
          <h4>System Specs:</h4>
          <ul>
            <li>Memory: GB</li>
            <li>Storage: GB</li>
            <li>OCPUS: </li>
            <li>GPU: </li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

async function getSystemConfigs(setError: any) {
  const result = await window.electron.ipcRendererOCI.listSystemConfigurations(
    'list-system-configs'
  );
  console.log(result);
  if (result.success === 'true') {
    console.log('Successfully retrieved system configs');
    return result.configs;
  }
  console.log('Error retrieving system configs');
  setError(result.error.message);
  return [];
}

function NewSystemSelection({
  selectedNewSystem,
  setSelectedNewSystem,
  setError,
  openNewSystemSelection,
}: any) {
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      setConfigs(await getSystemConfigs(setError));
    }
    fetchData();
  }, [openNewSystemSelection, setError]);
  return (
    <div id="Create System Select">
      <ul>
        {configs.map((config) => (
          <ListNewSystem
            config={config}
            selectedNewSystem={selectedNewSystem}
            setSelectedNewSystem={setSelectedNewSystem}
          />
        ))}
      </ul>
    </div>
  );
}

// needs improving
async function createSystemRequest(
  instanceConfigurationId: string,
  displayName: string,
  setError: any,
  setLoading: any
) {
  console.log('Creating system: ', instanceConfigurationId);
  console.log('Display name: ', displayName);
  // make request to create system
  setLoading(`Creating System: ${displayName}`);
  window.electron.ipcRendererOCI.listenUpdate(
    'create-system-update',
    (event, message) => {
      console.log(message);
      setLoading(message);
    }
  );
  const system = await window.electron.ipcRendererOCI.createSystem(
    'create-system',
    instanceConfigurationId,
    displayName
  );
  console.log(system);

  if (system.success === 'true') {
    // system up, connecting
    console.log(system.message);
  } else {
    console.log(system.error);
    setLoading('');
    setError(system.error);
  }
}

function CreateSystemButton({
  selectedNewSystem,
  systemDisplayName,
  setError,
  setLoading,
}: any) {
  console.log(systemDisplayName);
  let name = '';
  const { id, displayName } = selectedNewSystem;
  if (systemDisplayName === '') {
    name = displayName;
  } else {
    name = systemDisplayName;
  }
  return (
    <button
      type="button"
      onClick={() => createSystemRequest(id, name, setError, setLoading)}
      // id={selected}
    >
      Create Selected new System? : {name}
    </button>
  );
}

function CreateSystemForm({
  selectedNewSystem,
  setSelectedNewSystem,
  setError,
  setOpenNewSystemSelection,
  setLoading,
}: any) {
  const [displayName, setDisplayName] = useState('');
  return (
    <div id="CreateSystemForm">
      <div className="CreateSystemFormContent">
        <button
          type="button"
          aria-label='Close "Create System" form'
          className="CloseCreateSystemForm"
          onClick={() => {
            setOpenNewSystemSelection(false);
          }}
        >
          &times;
        </button>
        <h2>Create a new System</h2>
        <NewSystemSelection
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
          setError={setError}
        />
        {selectedNewSystem.id !== '' ? (
          <>
            <h4>
              You can change the Systems name below, or leave it default. Note:
              the name must be unique!
            </h4>
            <input
              type="text"
              id="displayName"
              name="displayName"
              placeholder={selectedNewSystem.displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
              }}
            />
            <CreateSystemButton
              selectedNewSystem={selectedNewSystem}
              systemDisplayName={displayName}
              setError={setError}
              setLoading={setLoading}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

async function getUserSystems(setError: any) {
  const result = await window.electron.ipcRendererOCI.listUserSystems(
    'list-user-systems'
  );
  console.log(result);
  if (result.success === 'true') {
    console.log('Successfully retrieved user systems');
    return result.systems;
  }
  console.log('Error retrieving user systems');
  setError(result.error.message);
  return [];
}

function ListSystem({ system, selected, setSelected }: any) {
  const [open, setOpen] = useState(false);
  const { id, displayName, lifecycleState } = system;
  return (
    <li className="ConfigInfo" key={id}>
      <div className="InitialInfo">
        <span id={displayName}>
          <input
            type="radio"
            checked={selected.displayName === displayName}
            onChange={() => setSelected({ id, displayName, lifecycleState })}
          />
          {displayName}: {lifecycleState}
        </span>
        <span>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? '- Less Info' : '+ Advanced Info'}
          </button>
        </span>
      </div>
      {open ? (
        <div className="AdditionalInfo">
          <h4>System Specs:</h4>
          <ul>
            <li>Memory: {system.shapeConfig.memoryInGBs} GB</li>
            <li>Storage: {system.shapeConfig.storageInGBs} GB</li>
            <li>OCPUS: {system.shapeConfig.ocpus}</li>
            <li>GPU: {system.shapeConfig.gpus}</li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function SysSelection({ systems, selected, setSelected }: any) {
  return (
    <div id="User System Selection">
      <h1>Select your System below</h1>
      <ul>
        {systems.map((system: any) => (
          <ListSystem
            system={system}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

async function startSystemRequest(
  instanceConfigurationId: string,
  displayName: string,
  setError: any,
  setLoading: any
) {
  console.log('start system request: ', instanceConfigurationId, displayName);
  setLoading(`Starting System: ${displayName}`);
  // listen for updates
  window.electron.ipcRendererOCI.listenUpdate(
    'start-system-update',
    (event, message: String) => {
      console.log(message);
      setLoading(message);
    }
  );
  const system = await window.electron.ipcRendererOCI.startSystem(
    'start-system',
    instanceConfigurationId,
    displayName
  );
  if (system.success === 'success') {
    // system up, connecting
    console.log(system.message);
  } else {
    console.log(system.error);
    setLoading('');
    setError(system.error);
  }
}

async function reconnectSystemRequest(
  instanceConfigurationId: string,
  displayName: string,
  setError: any,
  setLoading: any
) {
  console.log('Reconnecting system: ', displayName);
  setLoading(`Reconnecting to System: ${displayName}`);

  // listen for updates
  window.electron.ipcRendererOCI.listenUpdate(
    'reconnect-system-update',
    (event, message: String) => {
      console.log(message);
      setLoading(message);
    }
  );

  const system = await window.electron.ipcRendererOCI.reconnectSystem(
    'reconnect-system',
    instanceConfigurationId,
    displayName
  );
  if (system.success === 'success') {
    // system up, connecting
    console.log(system.message);
  } else {
    console.log(system.error);
    setLoading('');
    setError(system.error);
  }
}

function StartSystemButton({ selected, setError, setLoading }: any) {
  console.log(selected.id);
  return (
    <button
      type="button"
      onClick={() =>
        startSystemRequest(
          selected.id,
          selected.displayName,
          setError,
          setLoading
        )
      }
      id={selected.id}
    >
      Start {selected.displayName}?
    </button>
  );
}

function ReconnectSystemButton({ selected, setLoading, setError }: any) {
  console.log(selected.id);
  return (
    <button
      type="button"
      onClick={() =>
        reconnectSystemRequest(
          selected.id,
          selected.displayName,
          setError,
          setLoading
        )
      }
      id={selected.id}
    >
      Reconnect to {selected.displayName}?
    </button>
  );
}

function LogoutButton(setError: SetStateAction<any>) {
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
            setError(result.error.message);
            return null;
          })
          .catch((err) => console.log(err));
      }}
    >
      Logout
    </button>
  );
}

export default function MainMenu({ ErrorPopup, error, setError }: any) {
  const [systems, setSystems] = useState([{}]);
  const [selected, setSelected] = useState({
    id: '',
    displayName: '',
    lifecycleState: '',
  });
  const [selectedNewSystem, setSelectedNewSystem] = useState({
    id: '',
    displayName: '',
  });
  const [openNewSystemSelection, setOpenNewSystemSelection] = useState(false);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    async function fetchData() {
      // You can await here
      const response = await getUserSystems(setError);
      setSystems(response);
    }
    fetchData();
  }, [setError]);

  if (systems.length > 0) {
    return (
      <div>
        {loading !== '' ? (
          <LoadingScreen loadingMessage={loading} />
        ) : (
          <div>
            {error !== '' ? (
              <ErrorPopup message={error} setError={setError} />
            ) : null}
            <SysSelection
              systems={systems}
              selected={selected}
              setSelected={setSelected}
              setError={setError}
              setLoading={setLoading}
            />
            {selected.id !== '' && selected.lifecycleState === 'RUNNING' ? (
              <ReconnectSystemButton
                selected={selected}
                setError={setError}
                setLoading={setLoading}
              />
            ) : null}
            {selected.id !== '' && selected.lifecycleState !== 'RUNNING' ? (
              <StartSystemButton
                selected={selected}
                setError={setError}
                setLoading={setLoading}
              />
            ) : null}
            <OpenSystemCreateButton
              setOpenNewSystemSelection={setOpenNewSystemSelection}
            />
            {openNewSystemSelection ? (
              <CreateSystemForm
                selectedNewSystem={selectedNewSystem}
                setSelectedNewSystem={setSelectedNewSystem}
                setError={setError}
                setOpenNewSystemSelection={setOpenNewSystemSelection}
                setLoading={setLoading}
              />
            ) : null}
            <LogoutButton setError={setError} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <h2>You have no systems yet, create a new one here!</h2>
      {error !== '' ? <ErrorPopup message={error} setError={setError} /> : null}
      {openNewSystemSelection ? (
        <CreateSystemForm
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
          setError={setError}
          setOpenNewSystemSelection={setOpenNewSystemSelection}
          setLoading={setLoading}
        />
      ) : null}
      <OpenSystemCreateButton
        setOpenNewSystemSelection={setOpenNewSystemSelection}
      />
      <LogoutButton setError={setError} />
    </div>
  );
}
