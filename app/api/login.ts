import request from './request';

export function getQrKey() {
  return request.get('/login/qr/key');
}

export function createQr(key: any) {
  return request.get('/login/qr/create', { params: { key, qrimg: true } });
}

export function checkQr(key: any) {
  return request.get('/login/qr/check', { params: { key, noCookie: true } });
}

export function getLoginStatus() {
  return request.get('/login/status');
}

export function getUserDetail() {
  return request.get('/user/account');
}

export function logout() {
  return request.get('/logout');
}

export function loginByCellphone(phone: string, password: string) {
  return request.post('/login/cellphone', {
    phone,
    password
  });
}

export function loginByUid(uid: string | number) {
  return request.get('/user/detail', {
    params: { uid }
  });
}
