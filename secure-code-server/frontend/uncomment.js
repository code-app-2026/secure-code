const fs = require('fs');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // fetchAllUsers
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ const res = await api\.get\('\/users'\);\s*\n\s*\/\/ setAllUsers\(res \|\| \[\]\);\s*\n\s*setAllUsers\([\s\S]*?\]\);/,
        "const res = await api.get('/users');\n            setAllUsers(res || []);"
    );

    // fetchProjects
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ const res = await api\.get\('\/projects'\);\s*\n\s*\/\/ setProjects\(res \|\| \[\]\);\s*\n\s*setProjects\([\s\S]*?\]\);/,
        "const res = await api.get('/projects');\n            setProjects(res || []);"
    );

    // fetchFileTree
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ const res = await api\.get\(`\/editor\/tree\?projectId=\$\{projectId\}&recursive=true`\);\s*\n\s*\/\/ setFileTree\(res \|\| \[\]\);\s*\n\s*setFileTree\([\s\S]*?\]\);/,
        "const res = await api.get(`/editor/tree?projectId=${projectId}&recursive=true`);\n            setFileTree(res || []);"
    );

    // handleCreateProject Create
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ await api\.post\('\/projects', \{ name: newProjectName\.trim\(\) \}\);\s*\n\s*setTimeout\(\(\) => \{\s*\n\s*setShowCreateModal\(false\);\s*\n\s*setNewProjectName\(''\);\s*\n\s*fetchProjects\(\);\s*\n\s*\}, 500\);/,
        "await api.post('/projects', { name: newProjectName.trim() });\n                setShowCreateModal(false);\n                setNewProjectName('');\n                fetchProjects();"
    );

    // handleCreateProject Edit
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ await api\.patch\(`\/projects\/\$\{activeProject\.id\}`\, \{ name: newProjectName\.trim\(\) \}\);\s*\n\s*setTimeout\(\(\) => \{\s*\n\s*setShowCreateModal\(false\);\s*\n\s*setNewProjectName\(''\);\s*\n\s*fetchProjects\(\);\s*\n\s*\}, 500\);/,
        "await api.patch(`/projects/${activeProject.id}`, { name: newProjectName.trim() });\n                    setShowCreateModal(false);\n                    setNewProjectName('');\n                    fetchProjects();"
    );

    // handleDeleteProject
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ await api\.delete\(`\/projects\/\$\{activeProject\.id\}`\);\s*\n\s*setTimeout\(\(\) => \{\s*\n\s*setShowDeleteModal\(false\);\s*\n\s*fetchProjects\(\);\s*\n\s*\}, 500\);/,
        "await api.delete(`/projects/${activeProject.id}`);\n                setShowDeleteModal(false);\n                fetchProjects();"
    );

    // handleAddMember
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ await api\.post\(`\/projects\/\$\{activeProject\.id\}\/users\/username`, \{ username: newMemberUsername \}\);\s*\n\s*\/\/ setNewMemberUsername\(''\);\s*\n\s*\/\/ await fetchProjects\(\);\s*\n\s*\/\/ const res = await api\.get\('\/projects'\);\s*\n\s*\/\/ const updatedProj = res\.find\(\(p: any\) => p\.id === activeProject\.id\);\s*\n\s*\/\/ if \(updatedProj\) setActiveProject\(updatedProj\);\s*\n\s*setTimeout\(\(\) => \{\s*\n\s*setNewMemberUsername\(''\);\s*\n\s*if \(activeProject\) \{\s*\n\s*const updatedProj = \{ \.\.\.activeProject, users: \[\.\.\.\(activeProject\.users \|\| \[\]\), \{ id: Math\.random\(\), username: newMemberUsername \}\] \};\s*\n\s*setActiveProject\(updatedProj\);\s*\n\s*setProjects\(projects\.map\(p => p\.id === activeProject\.id \? updatedProj : p\)\);\s*\n\s*\}\s*\n\s*\}, 500\);/,
        "await api.post(`/projects/${activeProject.id}/users/username`, { username: newMemberUsername });\n                setNewMemberUsername('');\n                await fetchProjects();\n                const res = await api.get('/projects');\n                const updatedProj = res.find((p: any) => p.id === activeProject.id);\n                if (updatedProj) setActiveProject(updatedProj);"
    );

    // handleRemoveMember
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ await api\.delete\(`\/projects\/\$\{activeProject\.id\}\/users\/\$\{userId\}`\);\s*\n\s*\/\/ await fetchProjects\(\);\s*\n\s*\/\/ const res = await api\.get\('\/projects'\);\s*\n\s*\/\/ const updatedProj = res\.find\(\(p: any\) => p\.id === activeProject\.id\);\s*\n\s*\/\/ if \(updatedProj\) setActiveProject\(updatedProj\);\s*\n\s*setTimeout\(\(\) => \{\s*\n\s*if \(activeProject\) \{\s*\n\s*const updatedProj = \{ \.\.\.activeProject, users: \(activeProject\.users \|\| \[\]\)\.filter\(\(u: any\) => u\.id !== userId\) \};\s*\n\s*setActiveProject\(updatedProj\);\s*\n\s*setProjects\(projects\.map\(p => p\.id === activeProject\.id \? updatedProj : p\)\);\s*\n\s*\}\s*\n\s*\}, 500\);/,
        "await api.delete(`/projects/${activeProject.id}/users/${userId}`);\n                await fetchProjects();\n                const res = await api.get('/projects');\n                const updatedProj = res.find((p: any) => p.id === activeProject.id);\n                if (updatedProj) setActiveProject(updatedProj);"
    );

    // handleDownloadZip
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ await api\.download\(`\/projects\/\$\{project\.id\}\/export`, `\$\{project\.name\}\.zip`\);\s*\n\s*setTimeout\(\(\) => \{\s*\n\s*alert\('Dummy download completed'\);\s*\n\s*setDownloadingProjectId\(null\);\s*\n\s*setOpenSettingsMenuId\(null\);\s*\n\s*\}, 1000\);/,
        "await api.download(`/projects/${project.id}/export`, `${project.name}.zip`);\n            setDownloadingProjectId(null);\n            setOpenSettingsMenuId(null);"
    );

    // handleUpdateProjectAccess
    content = content.replace(
        /\/\/ TODO: Uncomment when backend DB is ready\s*\n\s*\/\/ await api\.patch\(`\/projects\/\$\{updatedProject\.id\}`\, \{\s*\n\s*\/\/     allowedCommands: updatedProject\.allowedCommands,\s*\n\s*\/\/     allowedFiles: updatedProject\.allowedFiles\s*\n\s*\/\/ \}\);\s*\n\s*setTimeout\(\(\) => \{\s*\n\s*setActiveProject\(updatedProject\);\s*\n\s*setProjects\(projects\.map\(p => p\.id === updatedProject\.id \? updatedProject : p\)\);\s*\n\s*\}, 300\);/,
        "await api.patch(`/projects/${updatedProject.id}`, {\n                allowedCommands: updatedProject.allowedCommands,\n                allowedFiles: updatedProject.allowedFiles\n            });\n            setActiveProject(updatedProject);\n            setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));"
    );

    fs.writeFileSync(filePath, content);
}

processFile('d:/Design Sequence/secure-code-server/frontend/src/app/admin/projects/page.tsx');
