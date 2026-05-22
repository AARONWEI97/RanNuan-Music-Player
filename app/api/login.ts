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

// ─── 手机 + 密码登录（参数走 query，API 文档示例即 GET 形式） ───
export function loginByCellphone(phone: string, password: string) {
  return request.get('/login/cellphone', {
    params: { phone, password, randomCNIP: true, realIP: '116.25.146.177' }
  });
}

// ─── 验证码登录（phone + captcha） ───
export function loginByCaptcha(phone: string, captcha: string) {
  return request.get('/login/cellphone', {
    params: { phone, captcha, randomCNIP: true, realIP: '116.25.146.177' }
  });
}

// ─── 邮箱登录 ───
export function loginByEmail(email: string, password: string) {
  return request.get('/login', {
    params: { email, password, randomCNIP: true, realIP: '116.25.146.177' }
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
  return request.get('/register/anonimous', {
    params: { randomCNIP: true, realIP: '116.25.146.177' }
  });
}

// ─── 刷新登录状态 ───
export function refreshLogin() {
  return request.get('/login/refresh', {
    params: { randomCNIP: true, realIP: '116.25.146.177' }
  });
}

// ─── 发送验证码 ───
export function sendCaptcha(phone: string, ctcode?: string) {
  return request.get('/captcha/sent', {
    params: { phone, ctcode: ctcode || '86', randomCNIP: true, realIP: '116.25.146.177' }
  });
}

// ─── 校验验证码 ───
export function verifyCaptcha(phone: string, captcha: string, ctcode?: string) {
  return request.get('/captcha/verify', {
    params: { phone, captcha, ctcode: ctcode || '86', randomCNIP: true, realIP: '116.25.146.177' }
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
