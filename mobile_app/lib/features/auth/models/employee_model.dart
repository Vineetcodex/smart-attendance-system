class EmployeeModel {
  final String id;
  final String employeeCode;
  final String fullName;
  final String email;
  final String department;
  final String position;
  final String? photoUrl;
  final bool hasFaceRegistered;
  final String shiftStart;
  final String shiftEnd;
  final bool isApproved;
  final String approvalStatus;

  EmployeeModel({
    required this.id,
    required this.employeeCode,
    required this.fullName,
    required this.email,
    required this.department,
    required this.position,
    this.photoUrl,
    required this.hasFaceRegistered,
    required this.shiftStart,
    required this.shiftEnd,
    this.isApproved = true,
    this.approvalStatus = 'APPROVED',
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    return EmployeeModel(
      id: json['id'] ?? '',
      employeeCode: json['employeeCode'] ?? '',
      fullName: json['fullName'] ?? '',
      email: json['email'] ?? '',
      department: json['department'] ?? '',
      position: json['position'] ?? '',
      photoUrl: json['photoUrl'],
      hasFaceRegistered: json['hasFaceRegistered'] ?? true,
      shiftStart: json['shiftStart'] ?? '09:00',
      shiftEnd: json['shiftEnd'] ?? '18:00',
      isApproved: json['isApproved'] ?? (json['approvalStatus'] == 'APPROVED' || json['approvalStatus'] == null),
      approvalStatus: json['approvalStatus'] ?? 'APPROVED',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employeeCode': employeeCode,
      'fullName': fullName,
      'email': email,
      'department': department,
      'position': position,
      'photoUrl': photoUrl,
      'hasFaceRegistered': hasFaceRegistered,
      'shiftStart': shiftStart,
      'shiftEnd': shiftEnd,
      'isApproved': isApproved,
      'approvalStatus': approvalStatus,
    };
  }
}

