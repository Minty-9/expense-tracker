const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectsContainer = document.getElementById('projects');
const filterInput = document.getElementById('filter');

let projects = JSON.parse(localStorage.getItem('projects')) || [];

function updateLocalStorage() {
  localStorage.setItem('projects', JSON.stringify(projects));
}

function addProject(e) {
  e.preventDefault();
  const name = projectNameInput.value.trim();
  if (!name) return;

  const newProject = {
    id: Date.now(),
    name,
    createdAt: new Date().toISOString(),
    transactions: []
  };

  projects.unshift(newProject); // new ones on top
  updateLocalStorage();
  renderProjects();
  projectNameInput.value = '';
}

function deleteProject(projectId) {
  projects = projects.filter(p => p.id !== projectId);
  updateLocalStorage();
  renderProjects();
}

function addTransaction(projectId, text, amount, type) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const transaction = {
    id: Date.now(),
    text,
    amount: +amount,
    type,
    date: new Date().toISOString()
  };

  project.transactions.push(transaction);
  updateLocalStorage();
  renderProjects();
}

function removeTransaction(projectId, transactionId) {
  const project = projects.find(p => p.id === projectId);
  project.transactions = project.transactions.filter(t => t.id !== transactionId);
  updateLocalStorage();
  renderProjects();
}

function exportProjectCSV(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const headers = ['Description,Amount,Type,Date'];
  const rows = project.transactions.map(t =>
    `${t.text},${t.amount},${t.type},${new Date(t.date).toLocaleString()}`
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/\s+/g, '_')}_transactions.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function renderChart(canvasId, income, expense) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        data: [income, expense],
        backgroundColor: ['#4caf50', '#f44336'],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    }
  });
}

function renderProjects(list = projects) {
  projectsContainer.innerHTML = '';

  // sort by most recent project
  const sortedList = [...list].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  sortedList.forEach(project => {
    const projectDiv = document.createElement('div');
    projectDiv.classList.add('project');

    let income = 0, expense = 0;
    project.transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });

    const balance = income - expense;

    // sort transactions by most recent
    const sortedTransactions = [...project.transactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    projectDiv.innerHTML = `
      <h3>${project.name}</h3>
      <small>Created: ${new Date(project.createdAt).toLocaleDateString()}</small>
      <p class="balance">Balance: $${balance.toFixed(2)}</p>
      <canvas id="chart-${project.id}" height="100"></canvas>
      <p><span class="money plus">Income: +$${income.toFixed(2)}</span></p>
      <p><span class="money minus">Expense: -$${expense.toFixed(2)}</span></p>
      <form class="transaction-form" data-id="${project.id}">
        <input type="text" placeholder="Description..." required>
        <input type="number" placeholder="Amount..." required>
        <select>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <button type="submit">Add</button>
      </form>
      <ul class="transaction-list">
        ${sortedTransactions.map(t => `
          <li class="${t.type === 'income' ? 'plus' : 'minus'}">
            ${t.text} <span>${t.type === 'income' ? '+' : '-'}$${Math.abs(t.amount)}</span>
            <small>${new Date(t.date).toLocaleDateString()}</small>
            <button class="delete-btn" onclick="removeTransaction(${project.id}, ${t.id})">x</button>
          </li>
        `).join('')}
      </ul>
      <button class="delete-project" onclick="deleteProject(${project.id})">Delete Project</button>
      <button style="background:#2196f3;margin-top:10px;" onclick="exportProjectCSV(${project.id})">Export CSV</button>
    `;

    projectsContainer.appendChild(projectDiv);
    renderChart(`chart-${project.id}`, income, expense);
  });

  attachTransactionFormListeners();
}

function attachTransactionFormListeners() {
  const forms = document.querySelectorAll('.transaction-form');
  forms.forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const projectId = +form.dataset.id;
      const text = form.querySelector('input[type="text"]').value;
      const amount = form.querySelector('input[type="number"]').value;
      const type = form.querySelector('select').value;

      if (!text || !amount) return;
      addTransaction(projectId, text, amount, type);
    });
  });
}

// --- Filter logic fixed ---
filterInput.addEventListener('input', () => {
  const term = filterInput.value.toLowerCase();
  const filtered = projects.filter(p => p.name.toLowerCase().includes(term));
  renderProjects(filtered);
});

projectForm.addEventListener('submit', addProject);
renderProjects();
