<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { apiRequest } from '$lib/api';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let form = $state<{ form: string; message?: string; error?: string } | null>(null);
	let totalPages = $derived(Math.max(1, Math.ceil(data.users.total / data.pageSize)));

	function pageHref(page: number) {
		const params: string[] = [];
		if (page > 0) params.push(`page=${encodeURIComponent(String(page))}`);
		if (data.search) params.push(`search=${encodeURIComponent(data.search)}`);
		return params.length ? `/admin?${params.join('&')}` : '/admin';
	}

	function formMessage(prefix: string) {
		return form?.form === prefix ? form : null;
	}

	function adminForm(node: HTMLFormElement) {
		async function submit(event: SubmitEvent) {
			event.preventDefault();
			const action = node.getAttribute('action')?.replace('?/', '') ?? '';
			const values = Object.fromEntries(new FormData(node));
			const formId =
				action === 'role' || action === 'password'
					? `${action}-${values.userId}`
					: action === 'ban' || action === 'unban' || action === 'delete'
						? 'users'
						: action;
			try {
				const result = await apiRequest<{ message: string }>('/api/app/admin', {
					method: 'POST',
					body: JSON.stringify({ action, ...values })
				});
				form = { form: formId, message: result.message };
				await invalidateAll();
			} catch (cause) {
				form = {
					form: formId,
					error: cause instanceof Error ? cause.message : 'Unable to update user.'
				};
			}
		}
		node.addEventListener('submit', submit);
		return { destroy: () => node.removeEventListener('submit', submit) };
	}

	function searchUsers(event: SubmitEvent) {
		event.preventDefault();
		const search = String(new FormData(event.currentTarget as HTMLFormElement).get('search') ?? '');
		const path = search ? `/admin?search=${encodeURIComponent(search)}` : '/admin';
		void goto(resolve(path as '/admin'));
	}
</script>

<svelte:head><title>Users · Self Improvement</title></svelte:head>

<main class="app-gutter mx-auto max-w-6xl space-y-4 py-4 md:py-8">
	<header class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Users</h1>
			<p class="text-sm text-(--text)/64">Manage accounts through Better Auth.</p>
		</div>
		<div class="flex gap-2">
			<Button href="/" variant="ghost">Home</Button>
			<Button href="/profile" variant="ghost">Profile</Button>
		</div>
	</header>

	{#if form?.form === 'users'}
		<Alert variant={form.error ? 'destructive' : 'default'}>
			<AlertDescription>{form.error ?? form.message}</AlertDescription>
		</Alert>
	{/if}

	<Card>
		<CardHeader><CardTitle>Create user</CardTitle></CardHeader>
		<CardContent>
			<form
				class="grid gap-3 md:grid-cols-[1fr_1.3fr_1fr_120px_auto]"
				action="?/create"
				use:adminForm
			>
				<Input name="name" placeholder="Name" required />
				<Input name="email" type="email" placeholder="Email" required />
				<Input name="password" type="password" placeholder="Password" minlength={8} required />
				<select class="h-10 rounded-3xl bg-(--text)/5 px-4 text-sm" name="role">
					<option value="user">User</option>
					<option value="admin">Admin</option>
				</select>
				<Button type="submit">Create</Button>
			</form>
			{#if formMessage('create')}
				<Alert class="mt-4" variant={form?.error ? 'destructive' : 'default'}>
					<AlertDescription>{form?.error ?? form?.message}</AlertDescription>
				</Alert>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Accounts</CardTitle>
			<form class="flex gap-2" onsubmit={searchUsers}>
				<Input name="search" placeholder="Search email" value={data.search} />
				<Button type="submit" variant="ghost">Search</Button>
			</form>
		</CardHeader>
		<CardContent>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>User</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head>Manage</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.users.users as user (user.id)}
						<Table.Row>
							<Table.Cell>
								<p class="font-medium">{user.name}</p>
								<p class="text-xs text-(--text)/56">{user.email}</p>
							</Table.Cell>
							<Table.Cell><Badge>{user.role ?? 'user'}</Badge></Table.Cell>
							<Table.Cell>
								<Badge class={user.banned ? 'text-red-600 dark:text-red-400' : ''}>
									{user.banned ? 'Banned' : 'Active'}
								</Badge>
							</Table.Cell>
							<Table.Cell>{new Date(user.createdAt).toLocaleDateString()}</Table.Cell>
							<Table.Cell>
								<details class="w-64">
									<summary class="cursor-pointer text-sm font-medium">Manage</summary>
									<div class="mt-3 space-y-3 rounded-3xl bg-(--text)/5 p-3">
										<form class="flex gap-2" action="?/role" use:adminForm>
											<input type="hidden" name="userId" value={user.id} />
											<select
												class="h-9 flex-1 rounded-3xl bg-(--bg-elevated) px-3 text-sm"
												name="role"
												value={user.role ?? 'user'}
											>
												<option value="user">User</option>
												<option value="admin">Admin</option>
											</select>
											<Button size="sm" type="submit">Save</Button>
										</form>
										<form class="flex gap-2" action="?/password" use:adminForm>
											<input type="hidden" name="userId" value={user.id} />
											<Input
												name="newPassword"
												type="password"
												placeholder="New password"
												minlength={8}
												required
											/>
											<Button size="sm" type="submit">Set</Button>
										</form>
										<div class="grid grid-cols-2 gap-2">
											<form action={user.banned ? '?/unban' : '?/ban'} use:adminForm>
												<input type="hidden" name="userId" value={user.id} />
												<Button
													class="w-full"
													size="sm"
													type="submit"
													variant="ghost"
													disabled={user.id === data.currentUser.id}
												>
													{user.banned ? 'Restore' : 'Ban'}
												</Button>
											</form>
											<form
												action="?/delete"
												use:adminForm
												onsubmit={(event) =>
													!confirm(`Delete ${user.email}?`) && event.preventDefault()}
											>
												<input type="hidden" name="userId" value={user.id} />
												<Button
													class="w-full"
													size="sm"
													type="submit"
													variant="destructive"
													disabled={user.id === data.currentUser.id}>Delete</Button
												>
											</form>
										</div>
										{#if form?.form?.endsWith(user.id)}
											<Alert variant={form.error ? 'destructive' : 'default'}>
												<AlertDescription>{form.error ?? form.message}</AlertDescription>
											</Alert>
										{/if}
									</div>
								</details>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
			{#if data.users.users.length === 0}
				<p class="py-8 text-center text-sm text-(--text)/56">No users found.</p>
			{/if}
			<footer class="flex items-center justify-between pt-4 text-sm text-(--text)/64">
				<p>Page {data.page + 1} of {totalPages} · {data.users.total} users</p>
				<div class="flex gap-2">
					<Button
						href={pageHref(Math.max(0, data.page - 1))}
						variant="ghost"
						disabled={data.page === 0}>Previous</Button
					>
					<Button
						href={pageHref(data.page + 1)}
						variant="ghost"
						disabled={data.page + 1 >= totalPages}>Next</Button
					>
				</div>
			</footer>
		</CardContent>
	</Card>
</main>
