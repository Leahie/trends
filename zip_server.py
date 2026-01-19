import os
import zipfile

def zip_server_folder(output_file: str = "server-eb.zip", base_dir: str = "server"):
    with zipfile.ZipFile(output_file, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if d != "node_modules"]  # skip node_modules
            for fname in files:
                if fname.endswith(".zip") or fname.startswith(".env"):
                    continue
                file_path = os.path.join(root, fname)
                arcname = os.path.relpath(file_path, base_dir).replace(os.sep, "/")  # keep .platform, use forward slashes
                zipf.write(file_path, arcname)

if __name__ == "__main__":
    zip_server_folder()
    print("Created server-eb.zip with files at root")