import { request } from './http.client.js';
import { ENV } from '../config/env.js';

export async function addEmployee(employee) {
  return request(
    'POST',
    `${ENV.API_BASE_URL}/api/employee/add`,
    employee
  );
}

export async function updateEmployee(id, employee) {
  return request(
    'PUT',
    `${ENV.API_BASE_URL}/api/employee/update/${id}`,
    employee
  );
}

export async function deleteEmployee(id) {
  return request(
    'DELETE',
    `${ENV.API_BASE_URL}/api/employee/delete/${id}`
  );
}

export async function listEmployees() {
  return request(
    'GET',
    `${ENV.API_BASE_URL}/api/employee/list`
  );
}
