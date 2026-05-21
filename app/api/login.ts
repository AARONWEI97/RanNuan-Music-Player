import request from './request';

// ─── 二维码登录 ───
export function getQrKey() {
  return request.get('/login/qr/key');
}

export function createQr(key: any) {
  return request.get('/login/qr/create', { params: { key, qrimg: true } });
}

export function checkQr(key: any) {
  return request.get('/login/qr/check', { params: { key, noCookie: true } });
}

// ─── 手机 + 密码登录 ───
export function loginByCellphone(phone: string, password: string) {
  return request.post('/login/cellphone', {
    phone,
    password
  });
}

// ─── 验证码登录（phone + captcha） ───
export function loginByCaptcha(phone: string, captcha: string) {
  return request.post('/login/cellphone', {
    phone,
    captcha
  });
}

// ─── 邮箱登录 ───
export function loginByEmail(email: string, password: string) {
  return request.post('/login', {
    email,
    password
  });
}

// ─── UID 登录（仅公开信息） ───
export function loginByUid(uid: string | number) {
  return request.get('/user/detail', {
    params: { uid }
  });
}

// ─── 游客登录 ───
export function registerAnonymous() {
  return request.get('/register/anonimous');
}

// ─── 刷新登录状态 ───
export function refreshLogin() {
  return request.get('/login/refresh');
}

// ─── 发送验证码 ───
export function sendCaptcha(phone: string, ctcode?: string) {
  return request.get('/captcha/sent', {
    params: { phone, ctcode: ctcode || '86' }
  });
}

// ─── 校验验证码 ───
export function verifyCaptcha(phone: string, captcha: string, ctcode?: string) {
  return request.get('/captcha/verify', {
    params: { phone, captcha, ctcode: ctcode || '86' }
  });
}

// ─── 登录状态 / 退出 ───
export function getLoginStatus() {
  return request.get('/login/status');
}

export function getUserDetail() {
  return request.get('/user/account');
}

export function logout() {
  return request.get('/logout');
}
