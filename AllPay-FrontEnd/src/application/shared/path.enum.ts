export enum Path {
  Home = '/',
  Login = '/auth/signin',
  Users = '/user/',
  UserAdd = '/users/add/',
  UserEdit = '/users/[id]',
}

export const optionProtected = [
  { name: 'Dashboard', link: '/' },
  { name: 'User', link: '/user/' },
  { name: 'User add', link: '/users/add/' },
  { name: 'User add', link: '/users/[id]' }
]
