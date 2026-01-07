const treeContainer = document.getElementById('tree');

const debounce = (fn, wait = 600) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const saveMetadata = debounce(async (path, value, statusEl) => {
  statusEl.textContent = 'Saving...';
  await window.chronosynAPI.saveMetadata({ path, metadata: value });
  statusEl.textContent = 'Saved';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 1200);
});

const createNode = (node) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'tree-node';

  const header = document.createElement('div');
  header.className = 'node-header';

  if (node.type === 'directory') {
    const toggle = document.createElement('button');
    toggle.className = 'toggle';
    toggle.textContent = 'Collapse';
    header.appendChild(toggle);

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'children';
    node.children.forEach((child) => childrenContainer.appendChild(createNode(child)));

    toggle.addEventListener('click', () => {
      const hidden = childrenContainer.style.display === 'none';
      childrenContainer.style.display = hidden ? 'flex' : 'none';
      toggle.textContent = hidden ? 'Collapse' : 'Expand';
    });

    wrapper.appendChild(header);
    wrapper.appendChild(childrenContainer);
  } else {
    wrapper.appendChild(header);
  }

  const label = document.createElement('div');
  label.className = 'node-label';
  label.textContent = node.name;
  header.appendChild(label);

  const pathLabel = document.createElement('div');
  pathLabel.className = 'node-path';
  pathLabel.textContent = node.path;
  header.appendChild(pathLabel);

  const textarea = document.createElement('textarea');
  textarea.className = 'metadata';
  textarea.value = node.metadata || '';
  textarea.placeholder = 'Enter metadata (markdown)...';

  const status = document.createElement('div');
  status.className = 'status';

  textarea.addEventListener('input', (event) => {
    saveMetadata(node.path, event.target.value, status);
  });

  wrapper.appendChild(textarea);
  wrapper.appendChild(status);

  return wrapper;
};

const renderTree = (nodes) => {
  treeContainer.innerHTML = '';
  if (!nodes.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No content found in the content folder.';
    treeContainer.appendChild(empty);
    return;
  }

  nodes.forEach((node) => {
    treeContainer.appendChild(createNode(node));
  });
};

const loadTree = async () => {
  const tree = await window.chronosynAPI.getTree();
  renderTree(tree);
};

loadTree();
