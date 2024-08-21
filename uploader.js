// Konfigurasi Firebase (sesuaikan dengan proyek Firebase Anda)
var firebaseConfig = {
    apiKey: "AIzaSyDelR6U0wODl_68ktPH-sd_gk0ZcwjG6Ek",
    authDomain: "webhaxor.firebaseapp.com",
    databaseURL: "https://webhaxor-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "webhaxor",
    storageBucket: "webhaxor.appspot.com",
    messagingSenderId: "1012640228111",
    appId: "1:1012640228111:web:55fd66da4210c5120c547a",
    measurementId: "G-PBGR4TXJ2W"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Inisialisasi Firebase Storage
var storage = firebase.storage();
var storageRef = storage.ref();
var filesRef = firebase.database().ref('files');
var auth = firebase.auth();

// Inisialisasi Firebase Realtime Database
var database = firebase.database();
var filesRef = database.ref('html-files');

// Inisialisasi array untuk menyimpan data file
var filesData = [];

// Fungsi untuk mendapatkan tanggal terakhir kali dimodifikasi dari Firebase Storage
async function getLastModified(fileName) {
    try {
        const metadata = await storageRef.child('html-files/' + fileName).getMetadata();
        return new Date(metadata.updated);
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
}

// Panggil fungsi displayFilesInTable saat halaman dimuat
window.onload = function() {
    // Dapatkan daftar file dari Firebase Realtime Database dan urutkan berdasarkan views secara descending
    filesRef.orderByChild('views').on('value', function(snapshot) {
        // Reset data file sebelum menambahkannya kembali
        filesData = [];

        // Menyimpan semua promise getLastModified di dalam array
        var getLastModifiedPromises = [];

        // Iterate melalui setiap file dari Firebase Realtime Database
        snapshot.forEach(function(childSnapshot) {
            var fileData = childSnapshot.val();
            var fileName = fileData.name;
            var fileURL = fileData.url;
            var fileSize = fileData.size;
            var views = fileData.views || 0;

            // Dapatkan tanggal terakhir kali dimodifikasi dari Firebase Storage
            var lastModifiedPromise = getLastModified(fileName).then(function(lastModified) {
                // Format tanggal terakhir kali dimodifikasi
                var formattedLastModified = lastModified.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                });

                // Tambahkan informasi file ke dalam array
                filesData.push({
                    name: fileName,
                    url: fileURL,
                    size: fileSize,
                    views: views,
                    lastModified: formattedLastModified
                });
            });

            getLastModifiedPromises.push(lastModifiedPromise);
        });

        // Setelah semua promise selesai, lanjutkan dengan menampilkan data di tabel
        Promise.all(getLastModifiedPromises).then(function() {
            // Urutkan filesData berdasarkan views secara descending
            filesData.sort(function(a, b) {
                return b.views - a.views;
            });

            // Tampilkan file dalam tabel setelah pengurutan
            displayFilesInTable(filesData);

            // Tampilkan total file yang telah diupload
            displayTotalFiles(filesData.length);
        }).catch(function(error) {
            console.error('Error fetching last modified dates:', error);
        });
    });
};

// Fungsi untuk menampilkan file dalam tabel
function displayFilesInTable(filesData) {
    var table = document.getElementById('file-table');
    // Kosongkan tabel sebelum menambahkan data baru
    table.innerHTML = '';

    // Tambahkan judul kolom
    var thead = table.createTHead();
    var row = thead.insertRow();
    var headers = ['📁 Name', 'Size', 'Link', 'Views', 'Created'];
    headers.forEach(function(headerText) {
        var th = document.createElement('th');
        th.textContent = headerText;
        row.appendChild(th);
    });

    // Tambahkan data file ke dalam tabel
    filesData.forEach(function(fileData) {
        addFileToTable(fileData.name, fileData.url, fileData.size, fileData.views, fileData.lastModified);
    });
}

// Event Listener untuk menangani drop file
document.body.addEventListener('drop', function(event) {
    event.preventDefault();
    handleFileDrop(event);
});

// Event Listener untuk mencegah perilaku default pada drag over
document.body.addEventListener('dragover', function(event) {
    event.preventDefault();
});

// Fungsi untuk menangani drop file
function handleFileDrop(event) {
    var file = event.dataTransfer.files[0];

    // Validasi file harus berakhiran .html
    if (file.name.toLowerCase().endsWith('.html')) {
        uploadFileToStorage(file);
    } else {
        showNotification('File harus berakhiran .html');
    }
}

// Fungsi untuk mengunggah file ke Firebase Storage
function uploadFileToStorage(file) {
    // Tampilkan animasi loading sebelum mengunggah
    showLoadingAnimation();

    // Simpan file HTML ke Firebase Storage
    var uploadTask = storageRef.child('html-files/' + file.name).put(file);

    uploadTask.on('state_changed',
        function progress(snapshot) {
            var percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // Perbarui persentase di animasi loading
            var loadingPercent = document.querySelector('.loading-percent');
            loadingPercent.innerText = percentage.toFixed(2) + '%';
        },
        function error(error) {
            console.error('Error uploading file:', error);
            // Sembunyikan animasi jika terjadi kesalahan
            hideLoadingAnimation();
        },
        function complete() {
            // File berhasil diunggah, Anda dapat menambahkannya ke database atau mengambil URL
            // lalu menampilkannya dalam tabel

            // Dapatkan URL file yang diunggah
            uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                // Cek apakah file dengan nama yang sama sudah ada di Firebase Realtime Database
                filesRef.orderByChild('name').equalTo(file.name).once('value', function(snapshot) {
                    if (!snapshot.exists()) {
                        // Mengukur ukuran file
                        var fileSize = formatBytes(file.size);

                        // Jika belum ada, tambahkan informasi file ke Firebase Realtime Database
                        var fileData = {
                            name: file.name,
                            url: downloadURL,
                            size: fileSize,
                            views: 0 // Inisialisasi jumlah views ke 0
                        };
                        filesRef.push(fileData).then(function() {
                            // Sembunyikan animasi loading
                            hideLoadingAnimation();

                            // Tampilkan notifikasi
                            showNotification('File berhasil diunggah dan dapat dicari berdasarkan nama file.');

                            // Reload halaman setelah notifikasi ditutup
                            setTimeout(function() {
                                location.reload();
                            }, 2000);
                        }).catch(function(error) {
                            console.error('Error adding file data:', error);
                        });
                    } else {
                        // Sembunyikan animasi loading
                        hideLoadingAnimation();
                        // Tampilkan notifikasi
                        showNotification('File dengan nama yang sama sudah ada.');
                    }
                });
            });
        }
    );
}

// Fungsi untuk menambahkan informasi file ke dalam tabel
function addFileToTable(fileName, fileURL, fileSize, views, lastModified) {
    var table = document.getElementById('file-table');
    var newRow = table.insertRow();
    var cell1 = newRow.insertCell(0);
    var cell2 = newRow.insertCell(1);
    var cell3 = newRow.insertCell(2);
    var cell4 = newRow.insertCell(3);
    var cell5 = newRow.insertCell(4);

    cell1.innerHTML = '<a href="#" class="file-link">' + truncateFileName(fileName, 20) + '</a>';
    cell2.innerHTML = fileSize;
    var link = document.createElement('a');
    link.href = fileURL;
    link.target = '_blank';
    link.textContent = 'Open';
    cell3.appendChild(link);
    cell4.innerHTML = views;

    // Tampilkan tanggal terakhir kali dimodifikasi
    cell5.innerHTML = lastModified;

    // Tambahkan event listener untuk menampilkan detail file saat nama file diklik
    cell1.addEventListener('click', function(event) {
        event.preventDefault();
        showFileDetail(fileName, lastModified);
    });

    // Tambahkan event listener untuk menghitung jumlah klik
link.addEventListener('click', function(event) {
    event.preventDefault();
    var clickedFileName = fileName;

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Pengguna sudah login
            filesRef.orderByChild('name').equalTo(clickedFileName).once('value', function(snapshot) {
                if (snapshot.exists()) {
                    var fileKey = Object.keys(snapshot.val())[0];
                    var viewCount = (snapshot.val()[fileKey].views || 0) + 1;

                    // Simpan jumlah views yang telah ditingkatkan kembali ke Firebase Realtime Database
                    filesRef.child(fileKey).update({
                        views: viewCount
                    }).then(function() {
                        // Perbarui tampilan jumlah views
                        cell4.textContent = viewCount;

                        // Refresh halaman saat jumlah views telah diperbarui
                        setTimeout(function() {
                            window.open(link.href, '_blank'); // Buka tautan dalam tab baru
                            location.reload(); // Reload halaman
                        }, 1000);
                    }).catch(function(error) {
                        console.error('Error updating views:', error);
                    });
                }
            });
        } else {
            // Pengguna belum login, tampilkan pesan atau lakukan tindakan lain
            console.log('Pengguna belum login, tidak dapat menambah views.');
            window.open(link.href, '_blank'); // Buka tautan dalam tab baru
        }
    });
});
}

// Fungsi untuk memotong nama file yang panjang
function truncateFileName(fileName, maxLength) {
    if (fileName.length > maxLength) {
        return fileName.substring(0, maxLength) + '...';
    }
    return fileName;
}

// Fungsi untuk mencari file berdasarkan nama
function searchFilesByName(filesData, searchTerm) {
    return filesData.filter(function(fileData) {
        return fileData.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
}

// Tangani perubahan pada input pencarian
document.getElementById('search-input').addEventListener('input', function() {
    var searchTerm = this.value.trim();
    var filteredFiles = searchFilesByName(filesData, searchTerm);
    displayFilesInTable(filteredFiles);
});

// Container for loading spinner and message
function showLoadingAnimation() {
    Swal.fire({
        title: 'Loading...',
        text: 'Please wait while we process your request.',
        icon: 'info',
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading(); // Show loading spinner
        }
    });
}

function hideLoadingAnimation() {
    Swal.close(); // Close SweetAlert2
}

// Fungsi untuk menampilkan atau menyembunyikan elemen berdasarkan status login
function updateUI(user) {
    if (user) {
        // Pengguna sudah login
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('userPhoto').src = user.photoURL;
        document.getElementById('userNameEmail').textContent = user.displayName || user.email;
    } else {
        // Pengguna belum login
        document.getElementById('userInfo').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    }
}

// Fungsi login dengan Google
document.getElementById('googleSignInButton').addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(function(result) {
        // Login sukses
        var user = result.user;
        updateUI(user);

        // Tampilkan notifikasi sukses dan refresh halaman setelah notifikasi hilang
        Swal.fire({
            title: 'Login Sukses',
            text: 'Anda berhasil login!',
            icon: 'success',
            showConfirmButton: false,
            timer: 3000 // Durasi notifikasi dalam milidetik (3 detik)
        }).then(() => {
            window.location.reload();
        });
    }).catch(function(error) {
        console.error('Error during sign-in:', error);
        Swal.fire({
            title: 'Error',
            text: 'Terjadi kesalahan saat login: ' + error.message,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    });
});

// Pengecekan status login saat halaman dimuat
firebase.auth().onAuthStateChanged(function(user) {
    updateUI(user);

    if (user) {
        // Logika untuk mengunggah file
        document.getElementById('upload-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var fileInput = document.getElementById('html-file');
            var file = fileInput.files[0];

            // Periksa apakah pengguna telah memilih file
            if (!file) {
                Swal.fire({
                    title: 'Peringatan',
                    text: 'Anda belum memilih file untuk diunggah.',
                    icon: 'warning',
                    showConfirmButton: false,
                    timer: 3000
                });
                return;
            }

            // Tampilkan animasi loading sebelum mengunggah
            showLoadingAnimation();

            // Simpan file HTML ke Firebase Storage
            var uploadTask = storageRef.child('html-files/' + file.name).put(file);

            uploadTask.on('state_changed',
                function progress(snapshot) {
                    var percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    var loadingPercent = document.querySelector('.loading-percent');
                    if (loadingPercent) {
                        loadingPercent.innerText = percentage.toFixed(2) + '%';
                    }
                },
                function error(error) {
                    console.error('Error uploading file:', error);
                    hideLoadingAnimation();
                    Swal.fire({
                        title: 'Error',
                        text: 'Terjadi kesalahan saat mengunggah file: ' + error.message,
                        icon: 'error',
                        showConfirmButton: false,
                        timer: 3000
                    });
                },
                function complete() {
                    uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                        filesRef.orderByChild('name').equalTo(file.name).once('value', function(snapshot) {
                            if (!snapshot.exists()) {
                                var fileSize = formatBytes(file.size);

                                var fileData = {
                                    name: file.name,
                                    url: downloadURL,
                                    size: fileSize,
                                    views: 0
                                };
                                filesRef.push(fileData).then(function() {
                                    hideLoadingAnimation();
                                    Swal.fire({
                                        title: 'Sukses',
                                        text: 'File berhasil diunggah dan dapat dicari berdasarkan nama file.',
                                        icon: 'success',
                                        showConfirmButton: false,
                                        timer: 3000
                                    }).then(() => {
                                        fileInput.value = '';
                                    });
                                }).catch(function(error) {
                                    console.error('Error adding file data:', error);
                                    hideLoadingAnimation();
                                    Swal.fire({
                                        title: 'Error',
                                        text: 'Terjadi kesalahan saat menambahkan data file: ' + error.message,
                                        icon: 'error',
                                        showConfirmButton: false,
                                        timer: 3000
                                    });
                                });
                            } else {
                                hideLoadingAnimation();
                                Swal.fire({
                                    title: 'Info',
                                    text: 'File dengan nama yang sama sudah ada.',
                                    icon: 'info',
                                    showConfirmButton: false,
                                    timer: 3000
                                });
                                fileInput.value = '';
                            }
                        });
                    }).catch(function(error) {
                        console.error('Error getting download URL:', error);
                        hideLoadingAnimation();
                        Swal.fire({
                            title: 'Error',
                            text: 'Terjadi kesalahan saat mendapatkan URL file: ' + error.message,
                            icon: 'error',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    });
                }
            );
        });

        // Tombol Logout
        document.getElementById('logoutButton').addEventListener('click', function() {
            if (auth) { // Periksa apakah auth terdefinisi
                auth.signOut().then(function() {
                    // Pengguna berhasil logout
                    updateUI(null);
                    Swal.fire({
                        title: 'Logout',
                        text: 'Anda telah berhasil logout.',
                        icon: 'success',
                        showConfirmButton: false, // Hapus tombol OK
                        timer: 3000 // Durasi tampilan notifikasi dalam milidetik (3 detik)
                    }).then(() => {
                        // Refresh halaman untuk menghindari error Cross-Origin-Opener-Policy
                        window.location.reload();
                    });
                }).catch(function(error) {
                    console.error('Error during logout:', error);
                    Swal.fire({
                        title: 'Error',
                        text: 'Terjadi kesalahan saat logout: ' + error.message,
                        icon: 'error',
                        showConfirmButton: false, // Hapus tombol OK
                        timer: 3000 // Durasi tampilan notifikasi dalam milidetik (3 detik)
                    });
                });
            } else {
                console.error('Firebase Authentication is not initialized.');
            }
        });

    } else {
        // Pengguna belum login
        Swal.fire({
            title: 'Autentikasi Diperlukan',
            text: 'Anda harus login untuk mengunggah file.',
            icon: 'warning',
            confirmButtonText: 'Login'
        });
    }
});

// Fungsi untuk menampilkan notifikasi
function showNotification(message) {
    var notification = document.getElementById('notification');
    var notificationMessage = document.getElementById('notification-message');
    var notificationButton = document.getElementById('notification-button');
    notificationMessage.innerText = message;
    notification.style.display = 'block';

    notificationButton.addEventListener('click', function() {
        notification.style.display = 'none';
    });
}

// Tampilkan animasi loading
function showLoadingAnimation() {
    var loadingAnimation = document.getElementById('loading-animation');
    loadingAnimation.style.display = 'block';

    // Reset nilai persentase
    currentProgress = 0;
    var loadingPercent = document.querySelector('.loading-percent');
    loadingPercent.innerText = '0%';

    // Jalankan fungsi updateProgress setiap 40ms untuk mengupdate persentase
    var intervalId = setInterval(updateProgress, 40);

    // Fungsi untuk mengupdate persentase
    function updateProgress() {
        currentProgress += 1;
        if (currentProgress <= 100) {
            loadingPercent.innerText = currentProgress + '%';
        } else {
            clearInterval(intervalId);
        }
    }
}

// Sembunyikan animasi loading
function hideLoadingAnimation() {
    var loadingAnimation = document.getElementById('loading-animation');
    loadingAnimation.style.display = 'none';
}

// Fungsi untuk mengukur ukuran file
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Fungsi untuk menampilkan jumlah total file yang telah diupload
function displayTotalFiles(totalFiles) {
    var totalFilesElement = document.getElementById('total-files');
    totalFilesElement.innerText = 'All Files: ' + totalFiles;
}

// Fungsi untuk menampilkan modal dengan detail file
function showFileDetail(fileName, lastModified) {
    filesRef.orderByChild('name').equalTo(fileName).once('value', function(snapshot) {
        if (snapshot.exists()) {
            var fileData = snapshot.val()[Object.keys(snapshot.val())[0]];
            var fileSize = fileData.size;
            var fileType = getFileType(fileName); // Fungsi untuk mendapatkan tipe file
            var createdDate = lastModified;
            var fileURL = fileData.url;

            // Mengisi data pada modal
            var truncatedFileName = truncateFileName(fileName, 30);
            var showIcon = fileName.length <= 30;

            var fileNameContent = `<span class="file-name">${fileName.substring(0, 30)}</span>`;
            if (fileName.length > 30) {
                fileNameContent += `<span class="file-ellipsis">...</span>`;
            }
            if (showIcon) {
                fileNameContent += `
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="file-link-icon">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <path d="M15 3h6v6"></path>
                        <path d="M10 14 21 3"></path>
                    </svg>`;
            }

            document.getElementById('modalFileTitle').innerText = truncatedFileName;
            document.getElementById('modalFileName').innerHTML = `
                <a href="${fileURL}" target="_blank" class="file-link">
                    ${fileNameContent}
                </a>
            `;
            document.getElementById('modalFileSize').innerText = fileSize;
            document.getElementById('modalFileType').innerText = fileType;
            document.getElementById('modalFileCreated').innerText = createdDate;

            // Tampilkan modal
            var modal = document.getElementById('fileDetailModal');
            modal.style.display = 'block';

            // Tangani tombol close pada modal
            var closeBtn = document.getElementsByClassName('close')[0];
            closeBtn.onclick = function() {
                modal.style.display = 'none';
            };

            // Tangani klik di luar modal untuk menutupnya
            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = 'none';
                }
            };
        }
    });
}

// Fungsi untuk mendapatkan tipe file dari nama file
function getFileType(fileName) {
    var extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'html':
            return 'HTML Document';
        case 'css':
            return 'CSS Stylesheet';
        case 'js':
            return 'JavaScript File';
        default:
            return 'Unknown Type';
    }
}

// CSS untuk modal pop-up file name link dan SVG icon
var css = `
.file-link {
    text-decoration: none;
    color: #0000ff;
}

.file-link .file-name {
    text-decoration: underline;
}

.file-link-icon {
    margin-left: 4px;
}
`;
// Inject the CSS into the document
var style = document.createElement('style');
style.type = 'text/css';
if (style.styleSheet) {
    style.styleSheet.cssText = css;
} else {
    style.appendChild(document.createTextNode(css));
}
document.getElementsByTagName('head')[0].appendChild(style);

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Fungsi untuk mendapatkan dan menampilkan jumlah views dari Firebase Realtime Database
function displayViews() {
    var viewsElement = document.getElementById("views");

    // Mengakses data views tanpa memeriksa status login
    firebase.database().ref('pageViews').on('value', function(snapshot) {
        var views = snapshot.val();
        if (viewsElement && views !== null) {
            viewsElement.textContent = views;
        }
    }, function(error) {
        console.error("Error retrieving views:", error);
        // Tampilkan pesan kesalahan kepada pengguna jika perlu
    });
}

// Fungsi untuk menambah jumlah views pada Firebase Realtime Database
function incrementViews() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Pengguna sudah login, dapat mengakses data
            firebase.database().ref('pageViews').transaction(function(currentViews) {
                // Jika tidak ada data sebelumnya, mulai dari 1
                return (currentViews || 0) + 1;
            }, function(error, committed, snapshot) {
                if (error) {
                    console.error("Transaction failed abnormally!", error);
                    // Tampilkan pesan kesalahan kepada pengguna jika perlu
                } else if (!committed) {
                    console.log("Transaction aborted, data may be inconsistent.");
                    // Tampilkan pesan kepada pengguna jika transaksi dibatalkan
                } else {
                    console.log("Transaction successfully committed.");
                    // Tindakan setelah transaksi berhasil jika perlu
                }
            });
        } else {
            // Pengguna belum login, tidak dapat menambah views
            console.log('Pengguna belum login, tidak dapat menambah views.');
        }
    });
}

// Panggil fungsi untuk menampilkan views saat halaman dimuat
document.addEventListener("DOMContentLoaded", function() {
    displayViews();   // Tampilkan views saat halaman dimuat

    // Jika perlu, panggil incrementViews() saat halaman dimuat atau saat pengguna melakukan tindakan tertentu
    // incrementViews(); // Panggil fungsi ini sesuai kebutuhan, misalnya saat pengguna melakukan interaksi tertentu
});

document.addEventListener("DOMContentLoaded", function() {
    incrementViews(); // Panggil fungsi incrementViews() saat halaman dimuat
    displayViews();   // Tampilkan views saat halaman dimuat
});

document.getElementById('grid-button').addEventListener('click', function(event) {
    event.stopPropagation(); // Mencegah event bubbling
    toggleMenu(event);
});

function toggleMenu(event) {
    var menu = document.getElementById('menu');
    var button = event.target.closest('.upload-button');
    var rect = button.getBoundingClientRect();

    // Menempatkan menu tepat di bawah tombol grid
    menu.style.top = rect.bottom + window.scrollY + 'px';
    menu.style.left = rect.left + window.scrollX + 'px';

    // Tampilkan atau sembunyikan menu dengan smooth transition
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
        setTimeout(() => {
            menu.style.opacity = 1;
        }, 0);
    } else {
        menu.style.opacity = 0;
        setTimeout(() => {
            menu.style.display = 'none';
        }, 300);
    }
}

// Fungsi untuk menutup menu ketika klik di luar menu
document.addEventListener('click', function(event) {
    var menu = document.getElementById('menu');
    var gridButton = document.getElementById('grid-button');
    if (!menu.contains(event.target) && !gridButton.contains(event.target)) {
        menu.style.opacity = 0;
        setTimeout(() => {
            menu.style.display = 'none';
        }, 300);
    }
});

var backButton = document.getElementById("back-to-top-button");

function scrollToTop(t) {
    let e = performance.now(),
        o = window.pageYOffset,
        n = -o;

    function l(a) {
        let i = a - e;
        if (i < t) {
            var c;
            window.scrollTo(0, o + n * ((c = i / t) < .5 ? 4 * c * c * c : (c - 1) * (2 * c - 2) * (2 * c - 2) + 1)), requestAnimationFrame(l)
        } else window.scrollTo(0, o + n)
    }
    requestAnimationFrame(l)
}
var previousActiveMenu = null;

// Fungsi myFunction() diubah menjadi id saja
var menuIcon = document.getElementById("menuIcon");
menuIcon.addEventListener("click", function() {
    var t = document.getElementById("myTopnav"),
        e = document.getElementById("icon-home");
    if ("topnav" === t.className) {
        t.className += " responsive";
        e.innerHTML = '<path d="M19 6.41l-1.41-1.41-5.59 5.59-5.59-5.59-1.41 1.41 5.59 5.59-5.59 5.59 1.41 1.41 5.59-5.59 5.59 5.59 1.41-1.41-5.59-5.59 5.59-5.59z" fill="white"></path>';
    } else {
        t.className = "topnav";
        e.innerHTML = '<path d="M1 17h22v2h-22v-2zm0-12v2h22v-2h-22zm0 8h22v-2h-22v2z" fill="white"></path>';
    }
});

window.onscroll = function() {
    document.body.scrollTop > 300 || document.documentElement.scrollTop > 300 ? backButton.style.display = "block" : backButton.style.display = "none"
}, backButton.addEventListener("click", function() {
    scrollToTop(1e3)
});

// Fungsi untuk menampilkan notifikasi
function showNotification(message) {
    Swal.fire({
        title: 'Peringatan',
        text: message,
        icon: 'warning',
        showConfirmButton: false, // Hapus tombol OK
        timer: 3000 // Notifikasi akan menghilang setelah 3 detik
    });
}

// Tangani peristiwa seret dan lepas
document.addEventListener('DOMContentLoaded', function () {
    var dropZone = document.body;

    // Jangan biarkan browser membuka file saat ditarik dan dilepaskan
    dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
    });

    // Tangani peristiwa seret dan lepas
    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        var file = e.dataTransfer.files[0];

        // Periksa apakah file yang dijatuhkan adalah file HTML
        if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
            showNotification('Silakan pilih file dengan menekan tombol Choose File terlebih dahulu. Hanya file dengan ekstensi .html atau .htm yang dapat diunggah. Terima kasih.');
            return;
        }

        // Jika file HTML, lanjutkan dengan proses unggah
        uploadFile(file);
    });
});

// Fungsi untuk mengupload file
function uploadFile(file) {
    // Lakukan proses unggah file di sini
    // Anda dapat menggunakan kode upload yang Anda miliki sebelumnya
}

// Event listener untuk input file
document.getElementById('html-file').addEventListener('change', function() {
    var fileInput = this;
    var file = fileInput.files[0];
    
    if (file && !file.name.toLowerCase().endsWith('.html')) {
        Swal.fire({
            title: 'Peringatan',
            text: 'Hanya file HTML yang diizinkan.',
            icon: 'warning',
            showConfirmButton: false, // Hapus tombol OK
            timer: 3000 // Menampilkan notifikasi selama 3 detik
        });
        fileInput.value = ''; // Membersihkan nilai input file
    } else {
        // Jika file valid, lakukan upload
        uploadFile(file);
    }
});

window.addEventListener("scroll",scrollHaxorAI);
    function scrollHaxorAI(){
    var winScroll=document.body.scrollTop||document.documentElement.scrollTop;
    var height=document.documentElement.scrollHeight-document.documentElement.clientHeight;
    var scrolled=(winScroll/height)*100;
    document.getElementById("scrollbar-HaxorAI").style.width=scrolled+"%";
}

document.addEventListener("DOMContentLoaded", function() {
    // Menampilkan SweetAlert2 dengan spinner
    Swal.fire({
        title: 'Loading...',
        text: 'Please wait while we process your request.',
        icon: 'info',
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading(); // Menampilkan spinner loading
        }
    });

    // Menunda penutupan animasi selama 2 detik
    setTimeout(function() {
        Swal.close(); // Menutup animasi loading
        document.getElementById("programmer").textContent = "";
    }, 2000); // 2000 ms = 2 detik
});

// Menambahkan event listener untuk tombol show-content
document.getElementById('show-content-button').addEventListener('click', function() {
    document.getElementById('main-content').style.display = 'block';
    this.style.display = 'none'; // Sembunyikan tombol show-content setelah diklik
});

// Event listener untuk tombol close
document.querySelector('.close-icon').addEventListener('click', function() {
    // Sembunyikan main-content
    document.getElementById('main-content').style.display = 'none';
    // Tampilkan kembali tombol show-content
    document.getElementById('show-content-button').style.display = 'block';
});

// Fungsi untuk menangani klik tombol navigasi
const buttons = document.querySelectorAll(".card-buttons button");
const sections = document.querySelectorAll(".card-section");
const card = document.querySelector(".marijuana");

const handleButtonClick = (event) => {
    const targetAttribute = event.target.getAttribute("data-samuel-pasaribu");
    const targetSection = document.querySelector(targetAttribute);

    if (targetAttribute !== "#anonymoushaxorai") {
        card.classList.add("haxorai-active");
    } else {
        card.classList.remove("haxorai-active");
    }

    card.setAttribute("data-samuel", targetAttribute);

    sections.forEach(section => section.classList.remove("haxorai-active"));
    buttons.forEach(button => button.classList.remove("haxorai-active"));

    event.target.classList.add("haxorai-active");
    targetSection.classList.add("haxorai-active");
};

buttons.forEach(button => {
    button.addEventListener("click", handleButtonClick);
});

function isWebViewApp() {
    return (typeof RoboTemplatesWebViewApp !== 'undefined');
}

if (isWebViewApp()) {
    document.querySelector('button.contact-me').style.display = 'none';
    const links = document.querySelectorAll("a[href*='haxorai.com'],a[href*='haxor.com']");
    links.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
        });
    });
}

// Fungsi Untuk Menu Aktif
function showConfirmationDialog(){previousActiveMenu=document.querySelector(".topnav a.active"),document.getElementById("confirmationDialog").style.display="flex"}function setActive(t){for(var e=document.getElementsByClassName("topnav")[0].getElementsByTagName("a"),o=0;o<e.length;o++)e[o].classList.remove("active");t.classList.add("active")}
