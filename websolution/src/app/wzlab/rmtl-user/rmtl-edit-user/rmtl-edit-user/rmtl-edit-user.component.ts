import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-edit-user',
  templateUrl: './rmtl-edit-user.component.html',
  styleUrls: ['./rmtl-edit-user.component.css']
})
export class RmtlEditUserComponent {
 userId!: any;
  user: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiServicesService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id')!;
    this.getUserById(this.userId);
  }

  getUserById(id: any): void {
    this.api.getUser(id).subscribe({
      next: (res) => {
        this.user = res;
        this.user.rolesStr = this.user.roles?.join(', ') || '';
      },
      error: (err) => {
        console.error('Failed to fetch user', err);
        alert('User not found!');
        this.router.navigate(['/wzlab/user/user-list']);
      }
    });
  }

  onSubmit(): void {
    this.user.roles = this.user.rolesStr.split(',').map((r: string) => r.trim());
    this.api.updateUser(this.userId, this.user).subscribe({
      next: () => {
        alert('User updated successfully!');
        this.router.navigate(['/wzlab/user/user-list']);
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Failed to update user');
      }
    });
  }
}