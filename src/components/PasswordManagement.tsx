import React, { useState } from 'react';
import { changePassword, resetPassword } from '../firebase';

export const PasswordManagement: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [masterResetEmail, setMasterResetEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    try {
      await changePassword(newPassword);
      setMessage('Senha alterada com sucesso!');
      setError('');
    } catch (err) {
      setError('Erro ao alterar senha.');
      setMessage('');
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(resetEmail);
      setMessage('E-mail de redefinição enviado!');
      setError('');
    } catch (err) {
      setError('Erro ao enviar e-mail de redefinição.');
      setMessage('');
    }
  };

  const handleMasterResetPassword = async () => {
    try {
      await resetPassword(masterResetEmail);
      setMessage(`E-mail de redefinição enviado para ${masterResetEmail}!`);
      setError('');
    } catch (err) {
      setError('Erro ao enviar e-mail de redefinição.');
      setMessage('');
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-lg font-bold mb-4">Gerenciamento de Senha</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Nova Senha</label>
        <input 
          type="password" 
          value={newPassword} 
          onChange={e => setNewPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button onClick={handleChangePassword} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Alterar Senha</button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">E-mail para Recuperação</label>
        <input 
          type="email" 
          value={resetEmail} 
          onChange={e => setResetEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button onClick={handleResetPassword} className="mt-2 px-4 py-2 bg-slate-600 text-white rounded">Enviar E-mail de Recuperação</button>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-md font-bold mb-2">Resetar Senha de Usuário (Master)</h3>
        <label className="block text-sm font-medium mb-1">E-mail do Usuário</label>
        <input 
          type="email" 
          value={masterResetEmail} 
          onChange={e => setMasterResetEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button onClick={handleMasterResetPassword} className="mt-2 px-4 py-2 bg-rose-600 text-white rounded">Resetar Senha</button>
      </div>

      {message && <p className="mt-4 text-green-600">{message}</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
};
