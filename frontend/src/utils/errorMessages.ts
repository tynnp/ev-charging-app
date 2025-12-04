/* SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
 * This file is part of ev-charging-app and is licensed under the
 * MIT License. See the LICENSE file in the project root for details.
 */

export function translateError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Xử lý các lỗi network phổ biến
    if (message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network error')) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.'
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return 'Bạn không có quyền thực hiện thao tác này.'
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'Không tìm thấy tài nguyên yêu cầu.'
    }
    
    if (message.includes('server error') || message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'Lỗi máy chủ. Vui lòng thử lại sau.'
    }
    
    if (message.includes('bad request') || message.includes('400')) {
      return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.'
    }
    
    // Nếu thông báo lỗi đã là tiếng Việt, trả về nguyên bản
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(error.message)) {
      return error.message
    }
    
    // Nếu là lỗi HTTP status code
    if (message.includes('http')) {
      return `Lỗi kết nối: ${error.message}`
    }
    
    // Trả về thông báo lỗi gốc nếu không phải là lỗi network
    return error.message
  }
  
  if (typeof error === 'string') {
    // Kiểm tra xem đã là tiếng Việt chưa
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(error)) {
      return error
    }
    return error
  }
  
  return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.'
}

