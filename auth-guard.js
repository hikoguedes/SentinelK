(function() {
  const sessionStr = localStorage.getItem('sentinel_session');
  const path = window.location.pathname;
  
  // Calculate relative path back to root login.html
  let loginPath = '/login.html';
  if (path.includes('/partner/') || path.includes('/sentinelk/')) {
    loginPath = '../login.html';
  }

  // Global logout function accessible from onclick="logoutSession()"
  window.logoutSession = function() {
    console.log('[AuthGuard] Realizando logout da sessão.');
    localStorage.removeItem('sentinel_session');
    window.location.href = loginPath;
  };

  if (!sessionStr) {
    console.log('[AuthGuard] Nenhuma sessão encontrada. Redirecionando para o login.');
    window.location.href = loginPath;
    return;
  }

  const session = JSON.parse(sessionStr);
  const role = session.user ? session.user.role : null;

  // Role permissions checks
  if (path.includes('/sentinelk/')) {
    // Only superadmin can access SentinelK
    if (role !== 'superadmin') {
      alert('Acesso Negado: Apenas administradores do SentinelK podem acessar esta área.');
      if (role === 'partner_manager') {
        window.location.href = '../partner/b2b-setup.html';
      } else if (role === 'reception') {
        window.location.href = '../partner/b2b-restaurante.html';
      } else {
        window.location.href = loginPath;
      }
      return;
    }
  } else if (path.includes('/partner/')) {
    // Superadmin, partner_manager, and reception can access partner area, but with differences:
    // If receptionist tries to go to b2b-setup or gerenciar-parceiros, redirect them to b2b-restaurante
    if (!['superadmin', 'partner_manager', 'reception'].includes(role)) {
      alert('Acesso Negado: Sessão inválida.');
      window.location.href = loginPath;
      return;
    } else if (role === 'reception' && (path.includes('b2b-setup.html') || path.includes('gerenciar-parceiros.html') || path.includes('b2b.html'))) {
      alert('Acesso Restrito: Seu perfil de Recepção possui acesso apenas à Extranet Operacional.');
      window.location.href = 'b2b-restaurante.html';
      return;
    }
  }

  // Update session username dynamically in the UI and filter navigation by user role
  window.addEventListener('DOMContentLoaded', () => {
    const usernameEl = document.getElementById('session-username');
    if (usernameEl && session.user) {
      let roleLabel = session.user.role;
      if (roleLabel === 'superadmin') roleLabel = 'SuperAdmin';
      else if (roleLabel === 'partner_manager') roleLabel = 'Gestor Parceiro';
      else if (roleLabel === 'reception') roleLabel = 'Recepção';
      
      usernameEl.innerText = `${session.user.name} (${roleLabel})`;
    }

    // Filter sidebar navigation items based on data-role attribute
    const userRole = session.user ? session.user.role : null;
    if (userRole) {
      document.querySelectorAll('.nav-item, .sidebar-heading').forEach(el => {
        const allowedRolesStr = el.getAttribute('data-role');
        if (allowedRolesStr) {
          const allowedRoles = allowedRolesStr.split(',').map(r => r.trim());
          if (!allowedRoles.includes(userRole)) {
            el.style.display = 'none';
          }
        }
      });
    }
  });
})();
