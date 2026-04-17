const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectsContainer = document.getElementById('projects');
const filterInput = document.getElementById('filter');
const projectCount = document.getElementById('projectCount');
const emptyState = document.getElementById('emptyState');

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

  projects.unshift(newProject);
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

  const total = income + expense;
  const data = total === 0 ? [1, 0] : [income, expense];
  const colors = total === 0
    ? ['rgba(255,255,255,0.06)', 'transparent']
    : ['#3ddc84', '#ff5c5c'];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: total > 0,
          callbacks: {
            label: (ctx) => ` $${ctx.parsed.toFixed(2)}`
          }
        }
      }
    }
  });
}

function renderProjects(list = projects) {
  projectsContainer.innerHTML = '';

  const sortedList = [...list].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Update header count
  const count = sortedList.length;
  projectCount.textContent = `${count} project${count !== 1 ? 's' : ''}`;

  // Show/hide empty state
  if (count === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
  }

  sortedList.forEach((project, index) => {
    const projectDiv = document.createElement('div');
    projectDiv.classList.add('project');
    projectDiv.style.animationDelay = `${index * 0.05}s`;

    let income = 0, expense = 0;
    project.transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });

    const balance = income - expense;
    const balanceClass = balance >= 0 ? 'positive' : 'negative';
    const balanceSign = balance >= 0 ? '+' : '';

    const sortedTransactions = [...project.transactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    projectDiv.innerHTML = `
      <div class="project-header">
        <h3>${project.name}</h3>
      </div>
      <div class="project-date">Created ${new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>

      <div class="balance-wrap">
        <div class="balance-label">Balance</div>
        <div class="balance ${balanceClass}">$${Math.abs(balance).toFixed(2)}</div>
      </div>

      <div class="chart-wrap">
        <canvas id="chart-${project.id}" width="110" height="110"></canvas>
      </div>

      <div class="ie-row">
        <div class="ie-card">
          <div class="ie-card-label income">↑ Income</div>
          <div class="ie-card-amount">$${income.toFixed(2)}</div>
        </div>
        <div class="ie-card">
          <div class="ie-card-label expense">↓ Expense</div>
          <div class="ie-card-amount">$${expense.toFixed(2)}</div>
        </div>
      </div>

      <div class="divider"></div>

      <span class="transaction-form-label">Add Transaction</span>
      <form class="transaction-form" data-id="${project.id}">
        <input type="text" placeholder="Description..." required autocomplete="off"/>
        <div class="form-row">
          <input type="number" placeholder="Amount..." required min="0" step="0.01"/>
          <select>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <button type="submit" class="btn-submit">Add Transaction</button>
      </form>

      ${sortedTransactions.length > 0 ? `
      <div class="divider"></div>
      <ul class="transaction-list">
        ${sortedTransactions.map(t => `
          <li class="${t.type === 'income' ? 'plus' : 'minus'}">
            <span class="t-dot"></span>
            <span class="t-desc">${t.text}</span>
            <span>${t.type === 'income' ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}</span>
            <small>${new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
            <button class="delete-btn" onclick="removeTransaction(${project.id}, ${t.id})" title="Remove">×</button>
          </li>
        `).join('')}
      </ul>
      ` : ''}

      <div class="divider"></div>
      <div class="card-actions">
        <button class="btn-delete-project" onclick="deleteProject(${project.id})">Delete Project</button>
        <button class="btn-export" onclick="exportProjectCSV(${project.id})">Export CSV</button>
      </div>
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

filterInput.addEventListener('input', () => {
  const term = filterInput.value.toLowerCase();
  const filtered = projects.filter(p => p.name.toLowerCase().includes(term));
  renderProjects(filtered);
});

projectForm.addEventListener('submit', addProject);
renderProjects();
