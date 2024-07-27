import os
import time
import argparse
import logging
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define min and max chunk sizes
MIN_CHUNK_SIZE = 512  # Minimum size of each chunk to read and write (in bytes)
MAX_CHUNK_SIZE = 2048 # Maximum size of each chunk to read and write (in bytes)


def format_bytes(size):
    """Formats bytes to KB, MB for easier reading."""
    power = 1024
    n = 0
    power_labels = {0: 'B', 1: 'KB', 2: 'MB'}
    while size > power:
        size /= power
        n += 1
    return f"{size:.2f} {power_labels[n]}"


def chunked_file_transfer(input_path, output_path, interval_ms):
    """
    Transfers the content of the input file to the output file in small chunks with a controlled interval.

    Args:
    - input_path (str): Path to the input file.
    - output_path (str): Path to the output file or directory.
    - interval_ms (int): Interval in milliseconds between writing each chunk.
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if os.path.isdir(output_path):
        output_path = os.path.join(output_path, os.path.basename(input_path))

    interval_sec = interval_ms / 1000.0

    try:
        with open(input_path, 'rb') as infile, open(output_path, 'wb') as outfile:
            total_bytes_written = 0
            while True:
                chunk_size = random.randint(MIN_CHUNK_SIZE, MAX_CHUNK_SIZE)
                chunk = infile.read(chunk_size)
                if not chunk:
                    break
                outfile.write(chunk)
                outfile.flush()  # Ensure the data is written to disk
                total_bytes_written += len(chunk)
                print(f"Written {len(chunk)} bytes to {output_path}, total written: {format_bytes(total_bytes_written)}")
                time.sleep(interval_sec)
    except KeyboardInterrupt:
        print("File transfer interrupted by user.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        logger.info(f"Total bytes written: {format_bytes(total_bytes_written)}")
        logger.info(f"File transfer from {input_path} to {output_path} completed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transfer a file in chunks with a controlled interval.")
    parser.add_argument("input_path", type=str, help="Path to the input raw file.")
    parser.add_argument("output_path", type=str, help="Path to the output file or directory.")
    parser.add_argument("--interval", type=int, default=1000, help="Interval in milliseconds between writing each chunk. Default is 1000 ms.")

    args = parser.parse_args()

    # Argument validation
    if not os.path.isfile(args.input_path):
        parser.error(f"The file {args.input_path} does not exist or is not a valid file.")

    chunked_file_transfer(args.input_path, args.output_path, args.interval)
